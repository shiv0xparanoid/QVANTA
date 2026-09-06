from typing import Literal, Optional
from pydantic import BaseModel, Field


class CircuitRepr(BaseModel):
    kind: Literal["qasm2", "json_ast", "qiskit_code"]
    value: str


class SimulationRequest(BaseModel):
    circuit_repr: CircuitRepr
    backend: Literal["qiskit_aer"] = "qiskit_aer"
    shots: int = Field(1024, ge=1, le=65536)


class SimulationResponse(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    counts: dict[str, int] = {}
    per_qubit_bloch: list[dict] = []
    statevector: Optional[list[dict]] = None
    execution_time_ms: float = 0.0
    error: Optional[str] = None
