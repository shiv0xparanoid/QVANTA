# Draco decoder folder

Drop the Draco WebAssembly decoder files here when you start shipping
compressed `.glb` / `.gltf` assets processed with Draco via `gltf-transform`:

```
public/draco/
  draco_decoder.wasm
  draco_wasm_wrapper.js
```

`three-loaders.ts` in `apps/web/src/lib/three-loaders.ts` points
`DRACOLoader.setDecoderPath('/draco/')` at this folder so models load
locally without pulling the decoder from a CDN.
