import re
import json
import time

from fastapi import APIRouter, HTTPException
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister, transpile
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Statevector, partial_trace, DensityMatrix
import numpy as np

from app.schemas import CircuitRepr, SimulationRequest, SimulationResponse
from app.queue import (
    generate_job_id,
    enqueue_job,
    get_job_result,
    is_redis_enabled,
    set_job_result,
)

router = APIRouter(prefix="/simulate", tags=["simulate"])

ALLOWED_QISKIT_LINE = re.compile(
    r'^\s*(qc\.h|qc\.x|qc\.y|qc\.z|qc\.cx|qc\.measure|qc\.barrier|'
    r'qc\.ry|qc\.rx|qc\.rz|qc\.swap|'
    r'from qiskit|import|QuantumCircuit|QuantumRegister|ClassicalRegister|'
    r'qc=|qc =).*$'
)

SINGLE_QUBIT_GATE = re.compile(r'qc\.(h|x|y|z)\s*\(\s*q?\[(\d+)\]\s*\)')
CX_GATE = re.compile(r'qc\.cx\s*\(\s*q?\[(\d+)\]\s*,\s*q?\[(\d+)\]\s*\)')
MEASURE_GATE = re.compile(r'qc\.measure\s*\(\s*q?\[(\d+)\]\s*,\s*c?\[(\d+)\]\s*\)')
ROT_GATE = re.compile(r'qc\.(rx|ry|rz)\s*\(\s*([^,]+)\s*,\s*q?\[(\d+)\]\s*\)')
SWAP_GATE = re.compile(r'qc\.swap\s*\(\s*q?\[(\d+)\]\s*,\s*q?\[(\d+)\]\s*\)')

GATE_MAP_JSON = {
    "H": "h",
    "X": "x",
    "Y": "y",
    "Z": "z",
    "CNOT": "cx",
    "Measure": "measure",
}

_NUMBER_RE = re.compile(r'^-?\d+(\.\d+)?$')
_FRACTION_RE = re.compile(r'^(-?\d+(\.\d+)?)\s*/\s*(\d+(\.\d+)?)$')

PI_VARIANTS = {"pi", "PI", "Pi", "np.pi", "numpy.pi"}


def _safe_parse_angle(expr: str) -> float:
    expr = expr.strip()

    for variant in PI_VARIANTS:
        if expr == variant:
            return float(np.pi)

    neg = False
    if expr.startswith("-"):
        neg = True
        expr = expr[1:].strip()

    if expr.startswith("+"):
        expr = expr[1:].strip()

    mfrac = _FRACTION_RE.match(expr)
    if mfrac:
        numer = float(mfrac.group(1))
        denom = float(mfrac.group(3))
        if denom == 0:
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": "Division by zero in angle"}
            )
        val = numer / denom
        return -val if neg else val

    mnum = _NUMBER_RE.match(expr)
    if mnum:
        val = float(expr)
        return -val if neg else val

    for variant in PI_VARIANTS:
        prefix = f"{variant}*"
        if expr.startswith(prefix):
            coeff_str = expr[len(prefix):].strip()
            mfrac2 = _FRACTION_RE.match(coeff_str)
            if mfrac2:
                numer = float(mfrac2.group(1))
                denom = float(mfrac2.group(3))
                if denom == 0:
                    raise HTTPException(
                        status_code=400,
                        detail={"code": "circuit_parse_error", "message": "Division by zero in angle"}
                    )
                val = float(np.pi) * numer / denom
                return -val if neg else val
            mnum2 = _NUMBER_RE.match(coeff_str)
            if mnum2:
                val = float(np.pi) * float(coeff_str)
                return -val if neg else val
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Cannot parse coefficient: {coeff_str}"}
            )

        suffix = f"*{variant}"
        if expr.endswith(suffix):
            coeff_str = expr[:-len(suffix)].strip()
            mfrac2 = _FRACTION_RE.match(coeff_str)
            if mfrac2:
                numer = float(mfrac2.group(1))
                denom = float(mfrac2.group(3))
                if denom == 0:
                    raise HTTPException(
                        status_code=400,
                        detail={"code": "circuit_parse_error", "message": "Division by zero in angle"}
                    )
                val = float(np.pi) * numer / denom
                return -val if neg else val
            mnum2 = _NUMBER_RE.match(coeff_str)
            if mnum2:
                val = float(np.pi) * float(coeff_str)
                return -val if neg else val
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Cannot parse coefficient: {coeff_str}"}
            )

        div_prefix = f"{variant}/"
        if expr.startswith(div_prefix):
            denom_str = expr[len(div_prefix):].strip()
            if _NUMBER_RE.match(denom_str):
                denom = float(denom_str)
                if denom == 0:
                    raise HTTPException(
                        status_code=400,
                        detail={"code": "circuit_parse_error", "message": "Division by zero in angle"}
                    )
                val = float(np.pi) / denom
                return -val if neg else val

    raise HTTPException(
        status_code=400,
        detail={"code": "circuit_parse_error", "message": f"Unsupported angle expression: {expr}"}
    )


def _parse_qasm2(value: str) -> QuantumCircuit:
    try:
        return QuantumCircuit.from_qasm_str(value)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": f"QASM2 parse error: {str(e)}"}
        )


def _parse_json_ast(value: str) -> QuantumCircuit:
    try:
        ast = json.loads(value)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": f"JSON parse error: {str(e)}"}
        )

    if not isinstance(ast, dict):
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": "JSON AST must be an object"}
        )

    n_qubits = ast.get("qubits")
    operations = ast.get("operations", [])

    if not isinstance(n_qubits, int) or n_qubits <= 0:
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": "qubits must be a positive integer"}
        )

    if not isinstance(operations, list):
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": "operations must be a list"}
        )

    has_measure = any(op.get("gate") == "Measure" for op in operations if isinstance(op, dict))

    qr = QuantumRegister(n_qubits, "q")
    if has_measure:
        cr = ClassicalRegister(n_qubits, "c")
        qc = QuantumCircuit(qr, cr)
    else:
        qc = QuantumCircuit(qr)

    for idx, op in enumerate(operations):
        if not isinstance(op, dict):
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Operation {idx} must be an object"}
            )

        gate_name = op.get("gate")
        qubit = op.get("qubit")
        target = op.get("target")

        if gate_name not in GATE_MAP_JSON:
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Unknown gate: {gate_name} at operation {idx}"}
            )

        mapped_gate = GATE_MAP_JSON[gate_name]

        if mapped_gate == "cx":
            if not isinstance(qubit, int) or not isinstance(target, int):
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"CNOT requires qubit and target at operation {idx}"}
                )
            if qubit < 0 or qubit >= n_qubits or target < 0 or target >= n_qubits:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"Qubit index out of range at operation {idx}"}
                )
            qc.cx(qubit, target)
        elif mapped_gate == "measure":
            if not has_measure:
                continue
            if not isinstance(qubit, int):
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"Measure requires qubit at operation {idx}"}
                )
            if qubit < 0 or qubit >= n_qubits:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"Qubit index out of range at operation {idx}"}
                )
            qc.measure(qubit, qubit)
        else:
            if not isinstance(qubit, int):
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"Gate {gate_name} requires qubit at operation {idx}"}
                )
            if qubit < 0 or qubit >= n_qubits:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "circuit_parse_error", "message": f"Qubit index out of range at operation {idx}"}
                )
            getattr(qc, mapped_gate)(qubit)

    return qc


def _parse_qiskit_code(value: str) -> QuantumCircuit:
    lines = value.split("\n")
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if not ALLOWED_QISKIT_LINE.match(line):
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Disallowed line in qiskit_code: {stripped[:80]}"}
            )

    n_qubits = 0
    n_clbits = 0
    qc_init_match = re.search(
        r'qc\s*=\s*QuantumCircuit\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)', value
    ) or re.search(
        r'qc\s*=\s*QuantumCircuit\s*\(\s*(\d+)\s*\)', value
    )

    if qc_init_match:
        groups = qc_init_match.groups()
        n_qubits = int(groups[0])
        if len(groups) > 1 and groups[1] is not None:
            n_clbits = int(groups[1])

    for m in SINGLE_QUBIT_GATE.finditer(value):
        q = int(m.group(2))
        if q + 1 > n_qubits:
            n_qubits = q + 1
    for m in CX_GATE.finditer(value):
        q1, q2 = int(m.group(1)), int(m.group(2))
        if q1 + 1 > n_qubits:
            n_qubits = q1 + 1
        if q2 + 1 > n_qubits:
            n_qubits = q2 + 1
    for m in ROT_GATE.finditer(value):
        q = int(m.group(3))
        if q + 1 > n_qubits:
            n_qubits = q + 1
    for m in SWAP_GATE.finditer(value):
        q1, q2 = int(m.group(1)), int(m.group(2))
        if q1 + 1 > n_qubits:
            n_qubits = q1 + 1
        if q2 + 1 > n_qubits:
            n_qubits = q2 + 1
    for m in MEASURE_GATE.finditer(value):
        q, c = int(m.group(1)), int(m.group(2))
        if q + 1 > n_qubits:
            n_qubits = q + 1
        if c + 1 > n_clbits:
            n_clbits = c + 1

    if n_qubits == 0:
        n_qubits = 1

    qr = QuantumRegister(n_qubits, "q")
    if n_clbits > 0:
        cr = ClassicalRegister(n_clbits if n_clbits > 0 else n_qubits, "c")
        qc = QuantumCircuit(qr, cr)
    else:
        qc = QuantumCircuit(qr)

    for m in SINGLE_QUBIT_GATE.finditer(value):
        gate = m.group(1)
        q = int(m.group(2))
        getattr(qc, gate)(q)

    for m in ROT_GATE.finditer(value):
        gate = m.group(1)
        angle_str = m.group(2).strip()
        try:
            angle = _safe_parse_angle(angle_str)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=400,
                detail={"code": "circuit_parse_error", "message": f"Cannot parse rotation angle: {angle_str}"}
            )
        q = int(m.group(3))
        getattr(qc, gate)(angle, q)

    for m in CX_GATE.finditer(value):
        q1, q2 = int(m.group(1)), int(m.group(2))
        qc.cx(q1, q2)

    for m in SWAP_GATE.finditer(value):
        q1, q2 = int(m.group(1)), int(m.group(2))
        qc.swap(q1, q2)

    for m in MEASURE_GATE.finditer(value):
        q, c = int(m.group(1)), int(m.group(2))
        if n_clbits == 0:
            cr_new = ClassicalRegister(max(n_qubits, c + 1), "c")
            qc.add_register(cr_new)
            n_clbits = cr_new.size
        qc.measure(q, c)

    return qc


def parse_circuit(circuit_repr: CircuitRepr) -> QuantumCircuit:
    if circuit_repr.kind == "qasm2":
        return _parse_qasm2(circuit_repr.value)
    elif circuit_repr.kind == "json_ast":
        return _parse_json_ast(circuit_repr.value)
    elif circuit_repr.kind == "qiskit_code":
        return _parse_qiskit_code(circuit_repr.value)
    else:
        raise HTTPException(
            status_code=400,
            detail={"code": "circuit_parse_error", "message": f"Unknown circuit kind: {circuit_repr.kind}"}
        )


def _bloch_from_density_matrix(rho: DensityMatrix) -> dict:
    data = rho.data
    rho_00 = data[0, 0]
    rho_01 = data[0, 1]
    rho_10 = data[1, 0]
    rho_11 = data[1, 1]
    x = 2.0 * float(np.real(rho_01))
    y = 2.0 * float(np.imag(rho_01))
    z = float(np.real(rho_00 - rho_11))
    return {"x": x, "y": y, "z": z}


def compute_per_qubit_bloch_from_statevector(sv: Statevector, n_qubits: int) -> list[dict]:
    bloch_list = []
    for i in range(n_qubits):
        keep_indices = [i]
        reduced = partial_trace(sv, [j for j in range(n_qubits) if j != i])
        bloch_list.append(_bloch_from_density_matrix(reduced))
    return bloch_list


def compute_per_qubit_bloch_from_densitymatrix(rho: DensityMatrix, n_qubits: int) -> list[dict]:
    bloch_list = []
    for i in range(n_qubits):
        reduced = partial_trace(rho, [j for j in range(n_qubits) if j != i])
        bloch_list.append(_bloch_from_density_matrix(reduced))
    return bloch_list


def statevector_to_list(sv: Statevector) -> list[dict]:
    result = []
    for amp in sv.data:
        result.append({"real": float(np.real(amp)), "imag": float(np.imag(amp))})
    return result


def has_measure_operations(qc: QuantumCircuit) -> bool:
    for instr, _, _ in qc.data:
        if instr.name == "measure":
            return True
    return False


def run_simulation_inline(qc: QuantumCircuit, shots: int) -> SimulationResponse:
    job_id = generate_job_id()
    start_time = time.time()

    try:
        n_qubits = qc.num_qubits
        has_meas = has_measure_operations(qc)
        has_clbits = qc.num_clbits > 0

        sim = AerSimulator(method="automatic")

        if has_meas and has_clbits:
            transpiled = transpile(qc, sim)
            result = sim.run(transpiled, shots=shots).result()
            counts_raw = result.get_counts()
            counts = {str(k): int(v) for k, v in counts_raw.items()}

            if hasattr(result, "results") and len(result.results) > 0:
                sv_result = None
                try:
                    sim_sv = AerSimulator(method="statevector")
                    qc_sv = qc.remove_final_measurements(inplace=False)
                    if qc_sv is None:
                        qc_sv = qc.copy()
                        qc_sv.remove_final_measurements()
                    transpiled_sv = transpile(qc_sv, sim_sv)
                    sv_res = sim_sv.run(transpiled_sv, shots=1).result()
                    if sv_res.success:
                        sv = Statevector(sv_res.get_statevector())
                        sv_result = statevector_to_list(sv)
                        per_qubit_bloch = compute_per_qubit_bloch_from_statevector(sv, n_qubits)
                    else:
                        per_qubit_bloch = []
                except Exception:
                    per_qubit_bloch = []
                    sv_result = None
            else:
                per_qubit_bloch = []
                sv_result = None
        else:
            sim_sv = AerSimulator(method="statevector")
            transpiled_sv = transpile(qc, sim_sv)
            sv_res = sim_sv.run(transpiled_sv, shots=1).result()
            sv = Statevector(sv_res.get_statevector())
            sv_result = statevector_to_list(sv)
            per_qubit_bloch = compute_per_qubit_bloch_from_statevector(sv, n_qubits)
            counts = {}

        execution_time_ms = (time.time() - start_time) * 1000.0

        return SimulationResponse(
            job_id=job_id,
            status="completed",
            counts=counts,
            per_qubit_bloch=per_qubit_bloch,
            statevector=sv_result,
            execution_time_ms=execution_time_ms,
            error=None,
        )
    except HTTPException:
        raise
    except Exception as e:
        execution_time_ms = (time.time() - start_time) * 1000.0
        return SimulationResponse(
            job_id=job_id,
            status="failed",
            counts={},
            per_qubit_bloch=[],
            statevector=None,
            execution_time_ms=execution_time_ms,
            error=str(e),
        )


@router.post("", response_model=SimulationResponse)
async def simulate_circuit(request: SimulationRequest) -> SimulationResponse:
    qc = parse_circuit(request.circuit_repr)

    should_queue = request.shots >= 8192 or is_redis_enabled()

    if should_queue and is_redis_enabled():
        job_id = generate_job_id()
        payload = {
            "circuit_repr": request.circuit_repr.model_dump(),
            "backend": request.backend,
            "shots": request.shots,
        }
        enqueued = enqueue_job(job_id, payload)
        if enqueued:
            return SimulationResponse(
                job_id=job_id,
                status="queued",
                counts={},
                per_qubit_bloch=[],
                statevector=None,
                execution_time_ms=0.0,
                error=None,
            )

    response = run_simulation_inline(qc, request.shots)

    if is_redis_enabled() and response.status == "completed":
        set_job_result(response.job_id, response.model_dump())

    return response


@router.get("/jobs/{job_id}", response_model=SimulationResponse)
async def get_job(job_id: str) -> SimulationResponse:
    result = get_job_result(job_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "job_not_found", "message": f"Job {job_id} not found"}
        )

    try:
        return SimulationResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"code": "job_decode_error", "message": f"Could not decode job result: {str(e)}"}
        )
