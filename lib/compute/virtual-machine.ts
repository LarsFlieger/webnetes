import { WASI } from "@wasmer/wasi";
import { WasmFs } from "@wasmer/wasmfs";
import * as Asyncify from "asyncify-wasm";
import { v4 } from "uuid";
import { InstanceDoesNotExistError } from "../errors/instance-does-not-exist";
import { UnimplementedRuntimeError } from "../errors/node-not-known";

export enum ECapabilities {}

export enum ERuntimes {
  WASI_GENERIC = "wasi_generic",
  WASI_TINYGO = "wasi_tinygo",
  JSSI_GO = "jssi_go",
  JSSI_TINYGO = "jssi_tinygo",
}

interface Container<T> {
  runtimeType: ERuntimes;
  instance: WebAssembly.Instance;
  runtime: T;
}

export class VirtualMachine {
  private containers = new Map<string, Container<any>>();

  async schedule(
    bin: Uint8Array,
    args: string[],
    env: any,
    imports: any,
    capabilities: ECapabilities[], // TODO: Add privileged capabilites
    runtime: ERuntimes
  ) {
    const id = v4();

    let wasiBindings: any = {};
    if (typeof window !== "undefined") {
      wasiBindings = await import("@wasmer/wasi/lib/bindings/browser");
    }

    let lowerI64Imports: any = async () => {};
    if (typeof window === "undefined") {
      lowerI64Imports = await import("@wasmer/wasm-transformer");
    } else {
      lowerI64Imports = await import(
        "@wasmer/wasm-transformer/lib/unoptimized/wasm-transformer.esm.js"
      );
    }

    switch (runtime) {
      case ERuntimes.WASI_GENERIC: {
        const wasmFs = new WasmFs();
        const wasi = new WASI({
          args,
          env: {},
          bindings: {
            ...wasiBindings,
            fs: wasmFs.fs,
          },
        });

        const module = await WebAssembly.compile(await lowerI64Imports(bin));
        const instance = await Asyncify.instantiate(module, {
          ...wasi.getImports(module),
          ...imports,
          env,
        });

        this.containers.set(id, {
          runtimeType: runtime,
          instance,
          runtime: wasi,
        });

        return {
          id,
          memory: instance.exports.memory,
        };
      }

      case ERuntimes.WASI_TINYGO: {
        const wasmFs = new WasmFs();
        const wasi = new WASI({
          args,
          env: {},
          bindings: {
            ...wasiBindings,
            fs: wasmFs.fs,
          },
        });
        const go = new (require("../../vendor/tinygo/wasm_exec.js"))();

        const module = await WebAssembly.compile(await lowerI64Imports(bin));
        const instance = await Asyncify.instantiate(module, {
          ...wasi.getImports(module),
          ...imports,
          env: {
            ...go.importObject.env,
            ...env,
          },
        });

        this.containers.set(id, {
          runtimeType: runtime,
          instance,
          runtime: wasi,
        });

        return {
          id,
          memory: instance.exports.memory,
        };
      }

      case ERuntimes.JSSI_GO: {
        const go = new (require("../../vendor/go/wasm_exec.js"))();

        const module = await WebAssembly.compile(bin);
        const instance = await WebAssembly.instantiate(module, go.importObject);

        (global as any).fs.read = (
          _: number,
          buffer: Uint8Array,
          ___: number,
          ____: number,
          _____: number,
          callback: Function
        ) => {
          new Promise<Uint8Array>((res) => {
            const rawInput = prompt("value for stdin:");
            const input = new TextEncoder().encode(rawInput + "\n");

            buffer.set(input);

            res(input);
          }).then((input) => callback(null, input.length));
        };
        (global as any).jssiImports = { ...imports, ...env };

        this.containers.set(id, {
          runtimeType: runtime,
          instance,
          runtime: go,
        });

        return {
          id,
          memory: instance.exports.mem,
        };
      }

      case ERuntimes.JSSI_TINYGO: {
        const go = new (require("../../vendor/tinygo/wasm_exec.js"))();

        const module = await WebAssembly.compile(bin);
        const instance = await WebAssembly.instantiate(module, go.importObject);

        (global as any).fs.read = (
          _: number,
          buffer: Uint8Array,
          ___: number,
          ____: number,
          _____: number,
          callback: Function
        ) => {
          new Promise<Uint8Array>((res) => {
            const rawInput = prompt("value for stdin:");
            const input = new TextEncoder().encode(rawInput + "\n");

            buffer.set(input);

            res(input);
          }).then((input) => callback(null, input.length));
        };
        (global as any).jssiImports = { ...imports, ...env };

        this.containers.set(id, {
          runtimeType: runtime,
          instance,
          runtime: go,
        });

        return {
          id,
          memory: instance.exports.memory,
        };
      }

      default: {
        throw new UnimplementedRuntimeError();
      }
    }
  }

  async start(id: string) {
    if (this.containers.has(id)) {
      const container = this.containers.get(id)!; // We check with `.has`

      switch (container.runtimeType) {
        case ERuntimes.WASI_GENERIC: {
          (container as Container<WASI>).runtime.start(container.instance);

          break;
        }

        case ERuntimes.WASI_TINYGO: {
          (container as Container<WASI>).runtime.start(container.instance);

          break;
        }

        case ERuntimes.JSSI_GO: {
          await (container as Container<any>).runtime.run(container.instance);

          break;
        }

        case ERuntimes.JSSI_TINYGO: {
          await (container as Container<any>).runtime.run(container.instance);

          break;
        }

        default: {
          throw new UnimplementedRuntimeError();
        }
      }
    } else {
      throw new InstanceDoesNotExistError();
    }
  }
}
