import { execFile, execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process$1 from "node:process";
import os from "node:os";
import { promisify } from "node:util";
import { createHash, randomInt } from "node:crypto";
import http from "node:http";
import { pipeline } from "node:stream";
var __defProp = Object.defineProperty;
var __commonJSMin = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __exportAll = (all, symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region node_modules/@modelcontextprotocol/server/dist/dialects-DoSzNhcb.mjs
/**
* Canonical `$schema` URIs per supported dialect (http + https variants, trailing-`#` stripped).
*/
const DRAFT_2020_12_URIS = /* @__PURE__ */ new Set(["https://json-schema.org/draft/2020-12/schema", "http://json-schema.org/draft/2020-12/schema"]);
const DRAFT_2019_09_URIS = /* @__PURE__ */ new Set(["https://json-schema.org/draft/2019-09/schema", "http://json-schema.org/draft/2019-09/schema"]);
const DRAFT_07_URIS = /* @__PURE__ */ new Set(["https://json-schema.org/draft-07/schema", "http://json-schema.org/draft-07/schema"]);
const DRAFT_06_URIS = /* @__PURE__ */ new Set(["https://json-schema.org/draft-06/schema", "http://json-schema.org/draft-06/schema"]);
/**
* Whether a `$schema` value declares the 2019-09 dialect — the only supported dialect with
* `$recursiveRef`/`$recursiveAnchor`. Non-throwing (unlike {@linkcode declaredDialect}) so
* wire-layer callers can consult it for documents whose dialect may be unsupported.
*/
function declares2019Dialect($schema) {
	return typeof $schema === "string" && DRAFT_2019_09_URIS.has($schema.replace(/#$/, ""));
}
/**
* Classify a schema's declared `$schema` dialect. No `$schema` (or a non-string one) means
* 2020-12. Any other dialect throws a plain `Error` with a clear message rather than letting the
* engine crash on an opaque internal error or silently mis-validate; `remedy` names the calling
* provider's escape hatch in that message.
*/
function declaredDialect(schema, remedy) {
	if (!("$schema" in schema) || typeof schema.$schema !== "string") return "2020-12";
	const declared = schema.$schema.replace(/#$/, "");
	if (DRAFT_2020_12_URIS.has(declared)) return "2020-12";
	if (DRAFT_2019_09_URIS.has(declared)) return "2019-09";
	if (DRAFT_07_URIS.has(declared) || DRAFT_06_URIS.has(declared)) return "draft-7";
	throw new Error(`JSON Schema declares an unsupported dialect ("$schema": "${schema.$schema.slice(0, 200)}"). The default validator supports JSON Schema 2020-12, 2019-09, draft-07, and draft-06; ${remedy}`);
}
//#endregion
//#region node_modules/zod/v4/core/util.js
function getEnumValues(entries) {
	const numericValues = Object.values(entries).filter((v) => typeof v === "number");
	return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
}
function joinValues(array, separator = "|") {
	return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
	if (typeof value === "bigint") return value.toString();
	return value;
}
var Cached = class {
	constructor(getter) {
		this._getter = getter;
		this._value = void 0;
	}
	get value() {
		const getter = this._getter;
		if (getter !== void 0) {
			this._value = getter();
			this._getter = void 0;
		}
		return this._value;
	}
};
function cached(getter) {
	return new Cached(getter);
}
function nullish(input) {
	return input === null || input === void 0;
}
function cleanRegex(source) {
	const start = source.startsWith("^") ? 1 : 0;
	const end = source.endsWith("$") ? source.length - 1 : source.length;
	return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
	const ratio = val / step;
	const roundedRatio = Math.round(ratio);
	const tolerance = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
	if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
	return ratio - roundedRatio;
}
const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
function defineLazy(object, key, getter) {
	let value = void 0;
	Object.defineProperty(object, key, {
		get() {
			if (value === EVALUATING) return;
			if (value === void 0) {
				value = EVALUATING;
				value = getter();
			}
			return value;
		},
		set(v) {
			Object.defineProperty(object, key, { value: v });
		},
		configurable: true
	});
}
function assignProp(target, prop, value) {
	Object.defineProperty(target, prop, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
}
/**
* Whichever object a def's `shape` currently answers from: the one the caller passed until the first read, the frozen copy after it.
*
* Its keys and descriptors read without invoking anything, which is what lets a discriminated union check its discriminator, and the cycle walk read a shape, without resolving a getter that references the schema being constructed. A def that answers `shape` from an accessor of its own has none.
*/
function rawShape(def) {
	const desc = Object.getOwnPropertyDescriptor(def, "shape");
	return desc?.get ? desc.get.raw : desc?.value;
}
function sourceShape(schema) {
	return rawShape(schema._zod.def) ?? schema._zod.def.shape;
}
function deferProp(target, key, getter) {
	Object.defineProperty(target, key, {
		get() {
			const value = getter();
			assignProp(this, key, value);
			return value;
		},
		enumerable: true,
		configurable: true
	});
}
function putProp(target, key, value) {
	if (key in target) assignProp(target, key, value);
	else target[key] = value;
}
/**
* Copies `keys` of `source`'s shape onto `target`, each value passed through `wrap`.
*
* A key the source has resolved is copied through now, so the derived shape states it outright and nothing has to resolve it to learn what it holds. A key the source still defers stays deferred, and reads back through the source's own `shape`, so it resolves once and both shapes get that one schema.
*/
function mirrorShape(target, source, keys, wrap) {
	const raw = sourceShape(source);
	for (const key of keys) {
		const desc = Object.getOwnPropertyDescriptor(raw, key);
		if (!desc.enumerable) continue;
		if (desc.get) deferProp(target, key, () => {
			const value = source._zod.def.shape[key];
			return wrap ? wrap(value, key) : value;
		});
		else putProp(target, key, wrap ? wrap(desc.value, key) : desc.value);
	}
}
function mirrorProps(target, source) {
	for (const key of Reflect.ownKeys(source)) {
		const desc = Object.getOwnPropertyDescriptor(source, key);
		if (!desc.enumerable) continue;
		if (desc.get) deferProp(target, key, () => source[key]);
		else putProp(target, key, desc.value);
	}
}
function mergeDefs(...defs) {
	const mergedDescriptors = {};
	for (const def of defs) {
		const descriptors = Object.getOwnPropertyDescriptors(def);
		Object.assign(mergedDescriptors, descriptors);
	}
	return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
	return JSON.stringify(str);
}
function slugify$1(input) {
	return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
	return typeof data === "object" && data !== null && !Array.isArray(data);
}
const allowsEval = /* @__PURE__*/ cached(() => {
	if (globalConfig.jitless) return false;
	if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
	try {
		new Function("");
		return true;
	} catch (_) {
		return false;
	}
});
function isPlainObject$2(o) {
	if (isObject(o) === false) return false;
	const ctor = o.constructor;
	if (ctor === void 0) return true;
	if (typeof ctor !== "function") return true;
	const prot = ctor.prototype;
	if (isObject(prot) === false) return false;
	if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
	return true;
}
function shallowClone(o) {
	if (isPlainObject$2(o)) return { ...o };
	if (Array.isArray(o)) return [...o];
	if (o instanceof Map) return new Map(o);
	if (o instanceof Set) return new Set(o);
	return o;
}
const propertyKeyTypes = /* @__PURE__*/ new Set([
	"string",
	"number",
	"symbol"
]);
function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
	const cl = new inst._zod.constr(def ?? inst._zod.def);
	if (!def || params?.parent) cl._zod.parent = inst;
	return cl;
}
function normalizeParams(_params) {
	const params = _params;
	if (!params) return {};
	if (typeof params === "string") return { error: () => params };
	if (params?.message !== void 0) {
		if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
		params.error = params.message;
	}
	delete params.message;
	if (typeof params.error === "string") return {
		...params,
		error: () => params.error
	};
	return params;
}
function stringifyPrimitive(value) {
	if (typeof value === "bigint") return value.toString() + "n";
	if (typeof value === "string") return `"${value}"`;
	return `${value}`;
}
function optionalKeys(shape) {
	return Object.keys(shape).filter((k) => {
		return shape[k]._zod.optin !== void 0 && shape[k]._zod.optout === "optional";
	});
}
const NUMBER_FORMAT_RANGES = /*@__PURE__*/ (() => ({
	safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
}))();
const BIGINT_FORMAT_RANGES = {
	int64: [/* @__PURE__*/ BigInt("-9223372036854775808"), /* @__PURE__*/ BigInt("9223372036854775807")],
	uint64: [/* @__PURE__*/ BigInt(0), /* @__PURE__*/ BigInt("18446744073709551615")]
};
function pick(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
	const newShape = {};
	mirrorShape(newShape, schema, maskedKeys(schema, mask));
	return clone(schema, mergeDefs(currDef, {
		shape: newShape,
		checks: []
	}));
}
function maskedKeys(schema, mask) {
	const raw = sourceShape(schema);
	const keys = [];
	for (const key of Reflect.ownKeys(mask)) {
		if (!Object.getOwnPropertyDescriptor(raw, key)?.enumerable) throw new Error(`Unrecognized key: "${String(key)}"`);
		if (mask[key]) keys.push(key);
	}
	return keys;
}
function omit(schema, mask) {
	const currDef = schema._zod.def;
	const checks = currDef.checks;
	if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
	const omitted = new Set(maskedKeys(schema, mask));
	const newShape = {};
	mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)).filter((key) => !omitted.has(key)));
	return clone(schema, mergeDefs(currDef, {
		shape: newShape,
		checks: []
	}));
}
function extend(schema, shape) {
	if (!isPlainObject$2(shape)) throw new Error("Invalid input to extend: expected a plain object");
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) {
		const existingShape = sourceShape(schema);
		for (const key of Reflect.ownKeys(shape)) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
	}
	return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
function extended(schema, shape) {
	const newShape = {};
	mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)));
	mirrorProps(newShape, shape);
	return newShape;
}
function safeExtend(schema, shape) {
	if (!isPlainObject$2(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
	return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
function merge(a, b) {
	if (!b?._zod?.def) throw new Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
	if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
	const newShape = {};
	mirrorShape(newShape, a, Reflect.ownKeys(sourceShape(a)));
	mirrorShape(newShape, b, Reflect.ownKeys(sourceShape(b)));
	return clone(a, mergeDefs(a._zod.def, {
		shape: newShape,
		get catchall() {
			return b._zod.def.catchall;
		},
		checks: b._zod.def.checks ?? []
	}));
}
function partial(Class, schema, mask, name = "partial") {
	const checks = schema._zod.def.checks;
	if (checks && checks.length > 0) throw new Error(`.${name}() cannot be used on object schemas containing refinements`);
	const selected = mask ? new Set(maskedKeys(schema, mask)) : void 0;
	const newShape = {};
	mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), Class && ((value, key) => selected && !selected.has(key) ? value : new Class({
		type: "optional",
		innerType: value
	})));
	return clone(schema, mergeDefs(schema._zod.def, {
		shape: newShape,
		checks: []
	}));
}
function required(Class, schema, mask) {
	const selected = mask ? new Set(maskedKeys(schema, mask)) : void 0;
	const newShape = {};
	mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), (value, key) => selected && !selected.has(key) ? value : new Class({
		type: "nonoptional",
		innerType: value
	}));
	return clone(schema, mergeDefs(schema._zod.def, { shape: newShape }));
}
function aborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
	return false;
}
function explicitlyAborted(x, startIndex = 0) {
	if (x.aborted === true) return true;
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
	return false;
}
function prefixIssues(path, issues) {
	return issues.map((iss) => {
		var _a;
		(_a = iss).path ?? (_a.path = []);
		iss.path.unshift(path);
		return iss;
	});
}
function unwrapMessage(message) {
	return typeof message === "string" ? message : message?.message;
}
function attachSchema(issues, start, inst) {
	var _a;
	for (let i = start; i < issues.length; i++) (_a = issues[i]).schema ?? (_a.schema = inst);
}
function finalizeIssue(iss, ctx, config) {
	var _a;
	const traits = iss.inst?._zod?.traits;
	if (traits?.has("$ZodType")) {
		if (traits.has("$ZodCheck")) (_a = iss).schema ?? (_a.schema = iss.inst);
		else iss.schema = iss.inst;
	}
	const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : void 0;
	const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
	const full = {};
	for (const k of Object.keys(iss)) {
		if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__") continue;
		full[k] = iss[k];
	}
	full.path ?? (full.path = []);
	full.message = message;
	if (ctx?.reportInput) full.input = iss.input;
	return full;
}
const highSurrogate = /[\uD800-\uDBFF]/;
function codePointLength(str) {
	const units = str.length;
	if (!highSurrogate.test(str)) return units;
	let count = units;
	for (let i = 0; i < units - 1; i++) if ((str.charCodeAt(i) & 64512) === 55296 && (str.charCodeAt(i + 1) & 64512) === 56320) {
		count--;
		i++;
	}
	return count;
}
function getLengthableOrigin(input) {
	if (Array.isArray(input)) return "array";
	if (typeof input === "string") return "string";
	return "unknown";
}
function parsedType(data) {
	const t = typeof data;
	switch (t) {
		case "number": return Number.isNaN(data) ? "nan" : "number";
		case "object": {
			if (data === null) return "null";
			if (Array.isArray(data)) return "array";
			const obj = data;
			if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) return obj.constructor.name;
		}
	}
	return t;
}
function issue(...args) {
	const [iss, input, inst] = args;
	if (typeof iss === "string") return {
		message: iss,
		code: "custom",
		input,
		inst
	};
	return { ...iss };
}
/**
* Installs a trait's members on its prototype. Each value builds that member for the instance on first read; the built value shadows the accessor as an own property, so a detached `const { parse } = schema` keeps working.
*
* Call this from a `proto` initializer, which runs once per prototype — never per instance.
*/
function members(proto, table) {
	for (const key in table) {
		const desc = Object.getOwnPropertyDescriptor(table, key);
		if (desc.get) Object.defineProperty(proto, key, {
			...desc,
			enumerable: false
		});
		else defineBound(proto, key, desc.value);
	}
}
/** Shadows a prototype member with an own value, so a getter that builds from the instance runs once. */
function own(inst, key, value, enumerable = true) {
	Object.defineProperty(inst, key, {
		configurable: true,
		writable: true,
		enumerable,
		value
	});
	return value;
}
/** Like {@link own}, for a member that was never an own data property and has to stay out of `Object.keys`. */
function hide(inst, key, value) {
	return own(inst, key, value, false);
}
/** Adds members a table derives from the instance: each builds on first read and shadows as own data, and assignment shadows the same way, as when these were own properties. */
function derived(computes, table) {
	for (const key in computes) {
		const compute = computes[key];
		Object.defineProperty(table, key, {
			configurable: true,
			enumerable: true,
			get() {
				return own(this, key, compute(this));
			},
			set(value) {
				own(this, key, value);
			}
		});
	}
	return table;
}
function defineBound(proto, key, fn) {
	Object.defineProperty(proto, key, {
		configurable: true,
		get() {
			return this == null ? fn : own(this, key, fn.bind(this));
		},
		set(value) {
			own(this, key, value);
		}
	});
}
/** Returns the prototype to install on, or `undefined` if this group is already installed on it. */
function claim(inst, sentinel) {
	const proto = Object.getPrototypeOf(inst);
	return sentinel in proto ? void 0 : proto;
}
let installing;
let broke = false;
const breaker = {
	configurable: true,
	get() {
		broke = true;
	}
};
/**
* Installs a lazily-derived internal on the `_zod` prototype of `inst`'s
* constructor, computed from the internals object itself and cached there on
* first read. One accessor per constructor rather than one per instance.
*/
function defineLazyInternal(inst, key, compute) {
	const proto = Object.getPrototypeOf(inst._zod);
	if (key in proto && installing !== inst._zod) {
		installing = void 0;
		return;
	}
	installing = inst._zod;
	Object.defineProperty(proto, key, {
		configurable: true,
		get() {
			Object.defineProperty(this, key, breaker);
			const outer = broke;
			broke = false;
			try {
				const value = compute(this);
				if (broke) delete this[key];
				else Object.defineProperty(this, key, {
					configurable: true,
					writable: true,
					value
				});
				broke = broke || outer;
				return value;
			} catch (err) {
				delete this[key];
				broke = broke || outer;
				throw err;
			}
		},
		set(value) {
			Object.defineProperty(this, key, {
				configurable: true,
				writable: true,
				value
			});
		}
	});
}
/**
* Installs `key` on `inst`'s prototype, computed by `make` on first read and cached there as an own
* data property. One accessor per constructor rather than one per instance, because an own accessor
* puts every instance after the first into v8 dictionary mode. The key doubles as the sentinel.
*/
function installLazyProp(inst, key, make, enumerable) {
	const proto = claim(inst, key);
	if (!proto) return;
	Object.defineProperty(proto, key, {
		configurable: true,
		get() {
			const desc = {
				configurable: true,
				writable: true,
				enumerable,
				value: void 0
			};
			Object.defineProperty(this, key, desc);
			desc.value = make(this);
			Object.defineProperty(this, key, desc);
			return desc.value;
		},
		set(value) {
			Object.defineProperty(this, key, {
				configurable: true,
				writable: true,
				enumerable,
				value
			});
		}
	});
}
/** Marks the thunk `_catch` synthesises for a constant catch value. `Function.length` cannot tell that thunk from a user callback — rest and defaulted parameters both report arity 0 — and a user callback reads `ctx.error`, whose issues only finalize correctly against the caller's per-parse error map. Provenance can say what arity cannot. A plain string key rather than `Symbol.for`, whose call at module scope no bundler can prove pure — the same shape that anchored `urlCanParse` into every build. */
const CONSTANT_CATCH = "~constantCatch";
/** Wraps a constant catch value in a thunk tagged with {@link CONSTANT_CATCH}. */
function constantCatch(value) {
	const fn = () => value;
	fn[CONSTANT_CATCH] = true;
	return fn;
}
//#endregion
//#region node_modules/zod/v4/core/core.js
var _a$1;
/** A special constant with type `never` */
const NEVER = /*@__PURE__*/ Object.freeze({ status: "aborted" });
const _zodDesc = {
	value: void 0,
	enumerable: false
};
let _E = "captureStackTrace" in Error ? Error : null;
function newError(Definition) {
	const E = _E;
	if (E) {
		const saved = E.stackTraceLimit;
		if (typeof saved === "number") {
			try {
				E.stackTraceLimit = 0;
			} catch {
				_E = null;
				return new Definition();
			}
			try {
				return new Definition();
			} finally {
				E.stackTraceLimit = saved;
			}
		}
	}
	return new Definition();
}
function $constructor(name, initializer, proto, params) {
	const zodProto = {};
	function Internals(def) {
		this.def = def;
		this.constr = _;
		this.traits = /* @__PURE__ */ new Set();
	}
	Internals.prototype = zodProto;
	const protoMembers = proto;
	const initialized = protoMembers && /* @__PURE__ */ new WeakSet();
	function init(inst, def) {
		if (!inst._zod) {
			_zodDesc.value = new Internals(def);
			try {
				Object.defineProperty(inst, "_zod", _zodDesc);
			} finally {
				_zodDesc.value = void 0;
			}
		} else if (inst._zod.traits.has(name)) return;
		inst._zod.traits.add(name);
		initializer(inst, def);
		if (initialized) {
			const own = Object.getPrototypeOf(inst);
			const ctorProto = inst._zod.constr.prototype;
			let up = own;
			while (up && up !== ctorProto) up = Object.getPrototypeOf(up);
			const target = up ?? own;
			if (!initialized.has(target)) {
				initialized.add(target);
				members(target, protoMembers);
			}
		}
		const proto = _.prototype;
		for (const k in proto) {
			if (!Object.prototype.hasOwnProperty.call(proto, k)) continue;
			if (!(k in inst)) inst[k] = proto[k].bind(inst);
		}
	}
	const Parent = params?.Parent ?? Object;
	class Definition extends Parent {}
	Object.defineProperty(Definition, "name", { value: name });
	function _(def) {
		const inst = params?.Parent ? newError(Definition) : this;
		init(inst, def);
		const deferred = inst._zod.deferred;
		if (deferred) {
			for (const fn of deferred) fn();
			inst._zod.deferred = void 0;
		}
		const pp = globalThis.__zod_globalConfig?.postProcessor;
		if (pp) pp(inst);
		return inst;
	}
	Object.defineProperty(_, "init", { value: init });
	Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
		if (params?.Parent && inst instanceof params.Parent) return true;
		return inst?._zod?.traits?.has(name);
	} });
	Object.defineProperty(_, "name", { value: name });
	return _;
}
var $ZodAsyncError = class extends Error {
	constructor() {
		super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
	}
};
var $ZodEncodeError = class extends Error {
	constructor(name) {
		super(`Encountered unidirectional transform during encode: ${name}`);
		this.name = "ZodEncodeError";
	}
};
(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
const globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
	if (newConfig) Object.assign(globalConfig, newConfig);
	return globalConfig;
}
//#endregion
//#region node_modules/zod/v4/core/errors.js
function _getMessage() {
	const internals = this._zod;
	internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
	return internals.message;
}
function _setMessage(value) {
	this._zod.message = value;
}
const _messageDesc = {
	get: _getMessage,
	set: _setMessage,
	enumerable: true,
	configurable: true
};
const _issuesDesc = {
	value: void 0,
	enumerable: false
};
const _installedToString = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
const initializer$1 = (inst, def) => {
	inst.name = "$ZodError";
	_issuesDesc.value = def;
	Object.defineProperty(inst, "issues", _issuesDesc);
	_issuesDesc.value = void 0;
	Object.defineProperty(inst, "message", _messageDesc);
	const proto = Object.getPrototypeOf(inst);
	if (!_installedToString.has(proto)) {
		_installedToString.add(proto);
		Object.defineProperty(proto, "toString", {
			configurable: true,
			enumerable: false,
			get() {
				const value = () => this.message;
				Object.defineProperty(this, "toString", {
					value,
					configurable: true,
					writable: true
				});
				return value;
			},
			set(value) {
				Object.defineProperty(this, "toString", {
					value,
					configurable: true,
					writable: true
				});
			}
		});
	}
};
const $ZodError = $constructor("$ZodError", initializer$1);
$constructor("$ZodError", initializer$1, void 0, { Parent: Error });
/** Get-or-create `obj[key]` as an own data property. A path segment naming an inherited member
* ("toString", "constructor") would otherwise read through to the prototype, and assigning
* "__proto__" would hit the setter instead of creating a key. */
function node(obj, key, make) {
	if (!Object.prototype.hasOwnProperty.call(obj, key)) {
		if (key === "__proto__") Object.defineProperty(obj, key, {
			value: make(),
			writable: true,
			enumerable: true,
			configurable: true
		});
		else obj[key] = make();
	}
	return obj[key];
}
function flattenError(error, mapper = (issue) => issue.message) {
	const fieldErrors = {};
	const formErrors = [];
	for (const sub of error.issues) if (sub.path.length > 0) node(fieldErrors, sub.path[0], () => []).push(mapper(sub));
	else formErrors.push(mapper(sub));
	return {
		formErrors,
		fieldErrors
	};
}
function formatError(error, mapper = (issue) => issue.message) {
	const fieldErrors = { _errors: [] };
	const processError = (error, path = []) => {
		for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
		else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
		else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
		else {
			const fullpath = [...path, ...issue.path];
			if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
			else {
				let curr = fieldErrors;
				let i = 0;
				while (i < fullpath.length) {
					const el = fullpath[i];
					const terminal = i === fullpath.length - 1;
					if (el === "_errors") {
						if (terminal) curr._errors.push(mapper(issue));
						i++;
						continue;
					}
					if (!Object.prototype.hasOwnProperty.call(curr, el)) Object.defineProperty(curr, el, {
						value: { _errors: [] },
						enumerable: true,
						writable: true,
						configurable: true
					});
					const node = curr[el];
					if (terminal) node._errors.push(mapper(issue));
					curr = node;
					i++;
				}
			}
		}
	};
	processError(error);
	return fieldErrors;
}
//#endregion
//#region node_modules/zod/v4/core/parse.js
function finalizeParams(callee, params) {
	return {
		callee: params?.callee ?? callee,
		Err: params?.Err
	};
}
const _parse = (_Err) => {
	const fn = (schema, value, _ctx, _params) => {
		const ctx = _ctx ? {
			..._ctx,
			async: false
		} : { async: false };
		const result = schema._zod.run({
			value,
			issues: []
		}, ctx);
		if (result instanceof Promise) throw new $ZodAsyncError();
		if (result.issues.length) {
			const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
			captureStackTrace(e, _params?.callee ?? fn);
			throw e;
		}
		return result.value;
	};
	return fn;
};
const _parseAsync = (_Err) => {
	const fn = async (schema, value, _ctx, params) => {
		const ctx = _ctx ? {
			..._ctx,
			async: true
		} : { async: true };
		let result = schema._zod.run({
			value,
			issues: []
		}, ctx);
		if (result instanceof Promise) result = await result;
		if (result.issues.length) {
			const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
			captureStackTrace(e, params?.callee ?? fn);
			throw e;
		}
		return result.value;
	};
	return fn;
};
const _safeParse = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	return result.issues.length ? failure(_Err, result.issues, ctx) : {
		success: true,
		data: result.value
	};
};
function failure(Err, issues, ctx) {
	let error;
	return {
		success: false,
		get error() {
			if (!error) {
				error = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
				issues = void 0;
				ctx = void 0;
			}
			return error;
		},
		set error(e) {
			error = e;
			issues = void 0;
			ctx = void 0;
		}
	};
}
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: true
	} : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	return result.issues.length ? failure(_Err, result.issues, ctx) : {
		success: true,
		data: result.value
	};
};
const COMPILE_INVALID = /* @__PURE__ */ Symbol.for("zod.compile.invalid");
const COMPILE_FALLBACK = /* @__PURE__ */ Symbol.for("zod.compile.fallback");
const validate$1 = ((schema, value, _ctx) => {
	const validator = schema._zod.bag.validator;
	if (validator !== void 0) {
		if (validator(value) !== COMPILE_INVALID) return true;
		if (validator.definite === true && _ctx === void 0) return false;
	}
	return validateFallback(schema, value, _ctx);
});
function validateFallback(schema, value, _ctx) {
	const ctx = _ctx ? {
		..._ctx,
		async: false,
		abortEarly: true
	} : {
		async: false,
		abortEarly: true
	};
	const fallbackRun = schema._zod.bag.fallbackRun;
	let result;
	if (fallbackRun) {
		ctx[COMPILE_FALLBACK] = true;
		result = fallbackRun({
			value,
			issues: []
		}, ctx);
	} else result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	return result.issues.length === 0;
}
const validateAsync$1 = async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: true,
		abortEarly: true
	} : {
		async: true,
		abortEarly: true
	};
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	return result.issues.length === 0;
};
const _encode = (_Err) => {
	const parse = _parse(_Err);
	const fn = (schema, value, _ctx, _params) => {
		const ctx = _ctx ? {
			..._ctx,
			direction: "backward"
		} : { direction: "backward" };
		return parse(schema, value, ctx, finalizeParams(fn, _params));
	};
	return fn;
};
const _decode = (_Err) => {
	const parse = _parse(_Err);
	const fn = (schema, value, _ctx, _params) => {
		return parse(schema, value, _ctx, finalizeParams(fn, _params));
	};
	return fn;
};
const _encodeAsync = (_Err) => {
	const parseAsync = _parseAsync(_Err);
	const fn = async (schema, value, _ctx, _params) => {
		const ctx = _ctx ? {
			..._ctx,
			direction: "backward"
		} : { direction: "backward" };
		return await parseAsync(schema, value, ctx, finalizeParams(fn, _params));
	};
	return fn;
};
const _decodeAsync = (_Err) => {
	const parseAsync = _parseAsync(_Err);
	const fn = async (schema, value, _ctx, _params) => {
		return await parseAsync(schema, value, _ctx, finalizeParams(fn, _params));
	};
	return fn;
};
const _safeEncode = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _safeParse(_Err)(schema, value, ctx);
};
const _safeDecode = (_Err) => (schema, value, _ctx) => {
	return _safeParse(_Err)(schema, value, _ctx);
};
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		direction: "backward"
	} : { direction: "backward" };
	return _safeParseAsync(_Err)(schema, value, ctx);
};
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
	return _safeParseAsync(_Err)(schema, value, _ctx);
};
//#endregion
//#region node_modules/zod/v4/core/regexes.js
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link cuid2} instead.
* See https://github.com/paralleldrive/cuid.
*/
const cuid = /^[cC][0-9a-z]{6,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
function nanoidOfLength(length) {
	return new RegExp(`^[a-zA-Z0-9_-]{${length}}$`);
}
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
const duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
/** Returns a regex for validating an RFC 9562/4122 UUID.
*
* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
const uuid = (version) => {
	if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
	return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
/** Practical email validation */
const email$1 = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const _emoji$1 = `^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$`;
function emoji() {
	return new RegExp(_emoji$1, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/;
const httpProtocol = /^https?$/;
const e164 = /^\+[1-9]\d{6,14}$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
/** Anchors a pattern source. The interpolation lives here rather than at the call site because
* esbuild will not drop a `@__PURE__` call whose own argument interpolates a variable, but it
* will drop `anchor(dateSource)`. Keeping it inline pinned `date` into every bundle. */
function anchor(source) {
	return new RegExp(`^${source}$`);
}
const date$2 = /*@__PURE__*/ anchor(dateSource);
function timeSource(args) {
	const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
	return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : args.seconds ? `${hhmm}:[0-5]\\d(?:\\.\\d+)?` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function time$1(args) {
	return new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
	const opts = ["Z"];
	if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
	const qualified = `${timeSource({
		precision: args.precision,
		seconds: true
	})}(?:${opts.join("|")})`;
	const timeRegex = args.local ? `${qualified}|${timeSource({ precision: args.precision })}` : qualified;
	return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const anyString = /^[\s\S]{0,}$/;
const integer = /^-?\d+$/;
const number$2 = /^-?\d+(?:\.\d+)?$/;
const boolean$1 = /^(?:true|false)$/i;
const _null$2 = /^null$/i;
const lowercase = /^[^A-Z]*$/;
const uppercase = /^[^a-z]*$/;
//#endregion
//#region node_modules/zod/v4/core/checks.js
const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
	var _a;
	inst._zod ?? (inst._zod = {});
	inst._zod.def = def;
	(_a = inst._zod).onattach ?? (_a.onattach = []);
});
/** Default `when` for length-based checks: run only on non-nullish values with a `length`. */
const _whenHasLength = (payload) => {
	const val = payload.value;
	return !nullish(val) && val.length !== void 0;
};
const numericOriginMap = {
	number: "number",
	bigint: "bigint",
	object: "date"
};
const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
		payload.issues.push({
			origin: numericOriginMap[typeof payload.value] ?? origin,
			code: "too_big",
			maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
		payload.issues.push({
			origin: numericOriginMap[typeof payload.value] ?? origin,
			code: "too_small",
			minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
		if (typeof payload.value === "bigint" ? def.value !== BigInt(0) && payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
		payload.issues.push({
			origin: typeof payload.value,
			code: "not_multiple_of",
			divisor: def.value,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
	$ZodCheck.init(inst, def);
	def.format = def.format || "float64";
	const isInt = def.format?.includes("int");
	const origin = isInt ? "int" : "number";
	const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (isInt) {
			if (!Number.isInteger(input)) {
				payload.issues.push({
					expected: origin,
					format: def.format,
					code: "invalid_type",
					continue: false,
					input,
					inst
				});
				return;
			}
			if (!Number.isSafeInteger(input)) {
				if (input > 0) payload.issues.push({
					input,
					code: "too_big",
					maximum: Number.MAX_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				else payload.issues.push({
					input,
					code: "too_small",
					minimum: Number.MIN_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					inclusive: true,
					continue: !def.abort
				});
				return;
			}
		}
		if (input < minimum) payload.issues.push({
			origin: "number",
			input,
			code: "too_small",
			minimum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
		if (input > maximum) payload.issues.push({
			origin: "number",
			input,
			code: "too_big",
			maximum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
	inst._zod.check = (payload) => {
		const input = payload.value;
		const units = input.length;
		if ((typeof input === "string" && units > def.maximum ? codePointLength(input) : units) <= def.maximum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: def.maximum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
	inst._zod.check = (payload) => {
		const input = payload.value;
		const units = input.length;
		if ((typeof input === "string" && units >= def.minimum && units < def.minimum * 2 ? codePointLength(input) : units) >= def.minimum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: def.minimum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
	inst._zod.check = (payload) => {
		const input = payload.value;
		const units = input.length;
		const length = typeof input === "string" && units >= def.length && units <= def.length * 2 ? codePointLength(input) : units;
		if (length === def.length) return;
		const origin = getLengthableOrigin(input);
		const tooBig = length > def.length;
		payload.issues.push({
			origin,
			...tooBig ? {
				code: "too_big",
				maximum: def.length
			} : {
				code: "too_small",
				minimum: def.length
			},
			inclusive: true,
			exact: true,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
	var _a, _b;
	$ZodCheck.init(inst, def);
	if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: def.format,
			input: payload.value,
			...def.pattern ? { pattern: def.pattern.toString() } : {},
			inst,
			continue: !def.abort
		});
	});
	else (_b = inst._zod).check ?? (_b.check = () => {});
});
const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			input: payload.value,
			pattern: def.pattern.toString(),
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
	def.pattern ?? (def.pattern = lowercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
	def.pattern ?? (def.pattern = uppercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
	$ZodCheck.init(inst, def);
	const escapedRegex = escapeRegex(def.includes);
	def.pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position},}${escapedRegex}` : escapedRegex);
	inst._zod.check = (payload) => {
		if (payload.value.includes(def.includes, def.position)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "includes",
			includes: def.includes,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.check = (payload) => {
		if (payload.value.startsWith(def.prefix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "starts_with",
			prefix: def.prefix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.check = (payload) => {
		if (payload.value.endsWith(def.suffix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "ends_with",
			suffix: def.suffix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		payload.value = def.tx(payload.value);
	};
});
//#endregion
//#region node_modules/zod/v4/core/doc.js
var Doc = class {
	constructor(args = [], closed = {}) {
		this.content = [];
		this.indent = 0;
		this.args = args;
		this.closed = closed;
	}
	indented(fn) {
		this.indent += 1;
		try {
			fn(this);
		} finally {
			this.indent -= 1;
		}
	}
	write(arg) {
		if (typeof arg === "function") {
			arg(this, { execution: "sync" });
			arg(this, { execution: "async" });
			return;
		}
		const lines = arg.split("\n").filter((x) => x);
		const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
		const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
		for (const line of dedented) this.content.push(line);
	}
	compile() {
		const F = Function;
		const content = this?.content ?? [``];
		return new F(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {\n${content.join("\n")}\n};`)(...Object.values(this.closed));
	}
};
//#endregion
//#region node_modules/zod/v4/core/versions.js
const version = {
	major: 4,
	minor: 6,
	patch: 5
};
//#endregion
//#region node_modules/zod/v4/core/schemas.js
const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
	var _a;
	inst ?? (inst = {});
	inst._zod.def = def;
	inst._zod.bag = inst._zod.bag || {};
	inst._zod.version = version;
	const defChecks = inst._zod.def.checks;
	const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
	for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
	if (checks.length === 0) {
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred?.push(() => {
			inst._zod.run = inst._zod.parse;
		});
	} else {
		const runChecks = (payload, checks, ctx) => {
			if (payload.memo) return payload;
			let isAborted = aborted(payload);
			let asyncResult;
			for (const ch of checks) {
				if (ch._zod.def.when) {
					if (explicitlyAborted(payload)) continue;
					if (!ch._zod.def.when(payload)) continue;
				} else if (isAborted) continue;
				const currLen = payload.issues.length;
				const _ = ch._zod.check(payload);
				if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
				if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
					await _;
					if (payload.issues.length === currLen) return;
					attachSchema(payload.issues, currLen, inst);
					if (!isAborted) isAborted = aborted(payload, currLen);
				});
				else {
					if (payload.issues.length === currLen) continue;
					attachSchema(payload.issues, currLen, inst);
					if (!isAborted) isAborted = aborted(payload, currLen);
				}
			}
			if (asyncResult) return asyncResult.then(() => {
				return payload;
			});
			return payload;
		};
		const handleCanaryResult = (canary, payload, ctx) => {
			if (aborted(canary)) {
				canary.aborted = true;
				return canary;
			}
			const checkResult = runChecks(payload, checks, ctx);
			if (checkResult instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
			}
			return inst._zod.parse(checkResult, ctx);
		};
		inst._zod.run = (payload, ctx) => {
			if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
			if (ctx.direction === "backward") {
				const canary = inst._zod.parse({
					value: payload.value,
					issues: []
				}, {
					...ctx,
					skipChecks: true
				});
				if (canary instanceof Promise) return canary.then((canary) => {
					return handleCanaryResult(canary, payload, ctx);
				});
				return handleCanaryResult(canary, payload, ctx);
			}
			const result = inst._zod.parse(payload, ctx);
			if (result instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return result.then((result) => runChecks(result, checks, ctx));
			}
			return runChecks(result, checks, ctx);
		};
	}
}, {
	get "~standard"() {
		return hide(this, "~standard", standardProps(this));
	},
	set "~standard"(value) {
		own(this, "~standard", value);
	}
});
/** The Standard Schema surface for `inst`. Shared so wrappers can extend it without forcing it. */
const toStandardResult = (r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())) } : { value: r.value };
async function validateAsync(inst, value) {
	const ctx = { async: true };
	return toStandardResult(await inst._zod.run({
		value,
		issues: []
	}, ctx), ctx);
}
function standardProps(inst) {
	return {
		validate: (value) => {
			const ctx = { async: false };
			try {
				const r = inst._zod.run({
					value,
					issues: []
				}, ctx);
				if (!(r instanceof Promise)) return toStandardResult(r, ctx);
			} catch (_) {}
			return validateAsync(inst, value);
		},
		vendor: "zod",
		version: 1
	};
}
const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = def.pattern ?? anyString;
	inst._zod.parse = (payload, _) => {
		if (def.coerce) try {
			payload.value = String(payload.value);
		} catch (_) {}
		if (typeof payload.value === "string") return payload;
		payload.issues.push({
			expected: "string",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	$ZodString.init(inst, def);
});
const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
	def.pattern ?? (def.pattern = guid);
	$ZodStringFormat.init(inst, def);
});
const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
	if (def.version) {
		const v = {
			v1: 1,
			v2: 2,
			v3: 3,
			v4: 4,
			v5: 5,
			v6: 6,
			v7: 7,
			v8: 8
		}[def.version];
		if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
		def.pattern ?? (def.pattern = uuid(v));
	} else def.pattern ?? (def.pattern = uuid());
	$ZodStringFormat.init(inst, def);
});
const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
	def.pattern ?? (def.pattern = email$1);
	$ZodStringFormat.init(inst, def);
});
function canParseURL(input) {
	try {
		if (typeof URL !== "undefined" && typeof URL.canParse === "function") return URL.canParse(input);
		new URL(input);
		return true;
	} catch {
		return false;
	}
}
function validateURL(trimmed, def) {
	if (!("normalize" in def) && !("hostname" in def) && !("protocol" in def)) return canParseURL(trimmed) || 2;
	return parseURLObject(trimmed, def);
}
/** Parses a URL while preserving the non-normalizing HTTP guard. */
function parseURLObject(trimmed, def) {
	if (!def.normalize && def.protocol?.source === httpProtocol.source && !/^https?:\/\//i.test(trimmed)) return 1;
	try {
		if (typeof URL !== "undefined") {
			const URLStatic = URL;
			if (typeof URLStatic.parse === "function") return URLStatic.parse(trimmed) ?? 2;
		}
		return new URL(trimmed);
	} catch {
		return 2;
	}
}
const asciiTabOrNewline = /[\t\n\r]/g;
/** The URL parser deletes every ASCII tab, LF and CR from its input before it parses, so `new URL("https://exa\nmple.com")` reports on `example.com`. Applying the same deletion to the returned value closes the half of that divergence which can move the host; the parser's other rewrite, stripping C0 controls at the edges, cannot. */
function stripTabAndNewline(value) {
	return value.replace(asciiTabOrNewline, "");
}
function urlHostnameOk(url, hostname) {
	hostname.lastIndex = 0;
	return hostname.test(url.hostname);
}
function urlProtocolOk(url, protocol) {
	protocol.lastIndex = 0;
	return protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol);
}
const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		try {
			const trimmed = payload.value.trim();
			const url = validateURL(trimmed, def);
			if (url === 1) {
				payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid URL format",
					input: payload.value,
					inst,
					continue: !def.abort
				});
				return;
			}
			if (url === 2) {
				payload.issues.push({
					code: "invalid_format",
					format: "url",
					input: payload.value,
					inst,
					continue: !def.abort
				});
				return;
			}
			if (url === true) {
				payload.value = stripTabAndNewline(trimmed);
				return;
			}
			if (def.hostname && !urlHostnameOk(url, def.hostname)) payload.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid hostname",
				pattern: def.hostname.source,
				input: payload.value,
				inst,
				continue: !def.abort
			});
			if (def.protocol && !urlProtocolOk(url, def.protocol)) payload.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid protocol",
				pattern: def.protocol.source,
				input: payload.value,
				inst,
				continue: !def.abort
			});
			payload.value = def.normalize ? url.href : stripTabAndNewline(trimmed);
			return;
		} catch (_) {
			payload.issues.push({
				code: "invalid_format",
				format: "url",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
	def.pattern ?? (def.pattern = emoji());
	$ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
	if (def.length !== void 0 && (!Number.isInteger(def.length) || def.length < 1)) throw new Error(`Invalid nanoid length: ${def.length}`);
	def.pattern ?? (def.pattern = def.length === void 0 ? nanoid : nanoidOfLength(def.length));
	$ZodStringFormat.init(inst, def);
});
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
* See https://github.com/paralleldrive/cuid.
*/
const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
	def.pattern ?? (def.pattern = cuid);
	$ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
	def.pattern ?? (def.pattern = cuid2);
	$ZodStringFormat.init(inst, def);
});
const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
	def.pattern ?? (def.pattern = ulid);
	$ZodStringFormat.init(inst, def);
});
const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
	def.pattern ?? (def.pattern = xid);
	$ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
	def.pattern ?? (def.pattern = ksuid);
	$ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
	def.pattern ?? (def.pattern = datetime$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
	def.pattern ?? (def.pattern = date$2);
	$ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
	def.pattern ?? (def.pattern = time$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
	def.pattern ?? (def.pattern = duration);
	$ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
	def.pattern ?? (def.pattern = ipv4);
	$ZodStringFormat.init(inst, def);
});
/** An IPv6 address is written with hex digits, colons and dots, and nothing else. The guard is what makes the check below an IPv6 check: `new URL("http://[...]")` parses an authority, not an address, so `@` and `\` re-delimit it and `"::@1\\"` validates against the host `0.0.0.1`. The URL parser also deletes ASCII tab, LF and CR rather than failing, which is how `"::1\n"` validated as `::1`. */
const ipv6Alphabet = /^[0-9a-fA-F:.]+$/;
function isValidIPv6(value) {
	if (!ipv6Alphabet.test(value)) return false;
	return canParseURL(`http://[${value}]`);
}
const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
	def.pattern ?? (def.pattern = ipv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (!isValidIPv6(payload.value)) payload.issues.push({
			code: "invalid_format",
			format: "ipv6",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv4);
	$ZodStringFormat.init(inst, def);
});
function isValidCIDRv6(value) {
	const parts = value.split("/");
	if (parts.length !== 2) return false;
	const [address, prefix] = parts;
	if (!prefix) return false;
	const prefixNum = Number(prefix);
	if (`${prefixNum}` !== prefix) return false;
	if (prefixNum < 0 || prefixNum > 128) return false;
	return isValidIPv6(address);
}
const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (!isValidCIDRv6(payload.value)) payload.issues.push({
			code: "invalid_format",
			format: "cidrv6",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
function isValidBase64(data) {
	if (data === "") return true;
	if (/\s/.test(data)) return false;
	if (data.length % 4 !== 0) return false;
	try {
		atob(data);
		return true;
	} catch {
		return false;
	}
}
const base64Charset = /^[0-9a-zA-Z+/]*={0,2}$/;
const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
	def.pattern ?? (def.pattern = base64Charset);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidBase64(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const base64urlCharset = /^[A-Za-z0-9_-]*$/;
function isValidBase64URL(data) {
	if (!base64urlCharset.test(data)) return false;
	const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
	return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}
const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
	def.pattern ?? (def.pattern = base64urlCharset);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidBase64URL(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
	def.pattern ?? (def.pattern = e164);
	$ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
	try {
		const tokensParts = token.split(".");
		if (tokensParts.length !== 3) return false;
		const [header] = tokensParts;
		if (!header) return false;
		const parsedHeader = JSON.parse(atob(header));
		if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
		if (!parsedHeader.alg) return false;
		if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
		return true;
	} catch {
		return false;
	}
}
const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidJWT(payload.value, def.alg)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = number$2;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Number(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
		const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : void 0 : void 0;
		payload.issues.push({
			expected: "number",
			code: "invalid_type",
			input,
			inst,
			...received ? { received } : {}
		});
		return payload;
	};
});
const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
	$ZodCheckNumberFormat.init(inst, def);
	$ZodNumber.init(inst, def);
});
const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = boolean$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Boolean(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "boolean") return payload;
		payload.issues.push({
			expected: "boolean",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
const $ZodNull = /*@__PURE__*/ $constructor("$ZodNull", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = _null$2;
	inst._zod.values = /* @__PURE__ */ new Set([null]);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (input === null) return payload;
		payload.issues.push({
			expected: "null",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
const $ZodAny = /*@__PURE__*/ $constructor("$ZodAny", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload) => payload;
});
const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload) => payload;
});
const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		payload.issues.push({
			expected: "never",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
function handleArrayResult(result, final, index) {
	if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
	final.value[index] = result.value;
}
const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
	$ZodType.init(inst, def);
	const memo = globalConfig.memoizer;
	memo?.attach(inst);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!Array.isArray(input)) {
			payload.issues.push({
				expected: "array",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = memo ? memo.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
		const proms = [];
		const abortEarly = ctx?.abortEarly;
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const result = def.element._zod.run({
				value: item,
				issues: []
			}, ctx);
			if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
			else {
				handleArrayResult(result, payload, i);
				if (abortEarly && result.issues.length !== 0 && aborted(result)) break;
			}
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
function handlePropertyResult(result, final, key, input, optin, optout) {
	const isPresent = key in input;
	const isOptionalOut = optout === "optional";
	if (!isPresent && isOptionalOut && optin === "optional") return;
	if (result.issues.length) {
		if (optin !== void 0 && isOptionalOut && !isPresent) return;
		final.issues.push(...prefixIssues(key, result.issues));
	}
	if (!isPresent && optin === void 0) {
		if (!result.issues.length) final.issues.push({
			code: "invalid_type",
			expected: "nonoptional",
			input: void 0,
			path: [key]
		});
		return;
	}
	if (result.value === void 0) {
		if (isPresent || optin === "defaulted" && !isOptionalOut) final.value[key] = void 0;
	} else final.value[key] = result.value;
}
const NO_SYMBOL_KEYS = [];
function normalizeDef(def) {
	const keys = Object.keys(def.shape);
	const ownSymbols = Object.getOwnPropertySymbols(def.shape);
	const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
	const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
	for (const k of allKeys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
	const okeys = optionalKeys(def.shape);
	return {
		...def,
		allKeys,
		symbolKeys,
		keySet: new Set(keys),
		numKeys: keys.length,
		optionalKeys: new Set(okeys)
	};
}
function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
	const unrecognized = [];
	const keySet = def.keySet;
	const _catchall = def.catchall._zod;
	const t = _catchall.def.type;
	const optin = _catchall.optin;
	const optout = _catchall.optout;
	let seen = 0;
	for (const key in input) {
		if (abortEarly && payload.issues.length !== seen) {
			if (aborted(payload, seen)) break;
			seen = payload.issues.length;
		}
		if (keySet.has(key)) continue;
		if (key === "__proto__") {
			if (t === "never") unrecognized.push(key);
			continue;
		}
		if (t === "never") {
			unrecognized.push(key);
			continue;
		}
		const r = _catchall.run({
			value: input[key],
			issues: []
		}, ctx);
		if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
		else handlePropertyResult(r, payload, key, input, optin, optout);
	}
	if (unrecognized.length) payload.issues.push({
		code: "unrecognized_keys",
		keys: unrecognized,
		input,
		inst,
		continue: true
	});
	if (!proms.length) return payload;
	return Promise.all(proms).then(() => {
		return payload;
	});
}
const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
	$ZodType.init(inst, def);
	const desc = Object.getOwnPropertyDescriptor(def, "shape");
	const sh = desc?.get ? desc.get.raw : def.shape ?? {};
	if (sh) {
		const get = () => {
			const newSh = { ...sh };
			Object.defineProperty(def, "shape", { value: newSh });
			get.raw = newSh;
			return newSh;
		};
		get.raw = sh;
		Object.defineProperty(def, "shape", { get });
	}
	const _normalized = cached(() => normalizeDef(def));
	defineLazyInternal(inst, "propValues", (zod) => {
		const shape = zod.def.shape;
		const propValues = {};
		for (const key in shape) {
			const field = shape[key]._zod;
			if (field.values) {
				if (!Object.prototype.hasOwnProperty.call(propValues, key)) assignProp(propValues, key, /* @__PURE__ */ new Set());
				for (const v of field.values) propValues[key].add(v);
				if (field.optin !== void 0) propValues[key].add(void 0);
			}
		}
		return propValues;
	});
	const isObject$2 = isObject;
	const catchall = def.catchall;
	let value;
	const memo = globalConfig.memoizer;
	memo?.attach(inst);
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$2(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
		const proms = [];
		const shape = value.shape;
		const abortEarly = ctx?.abortEarly;
		let seen = payload.issues.length;
		for (const key of value.allKeys) {
			if (abortEarly && payload.issues.length !== seen) {
				if (aborted(payload, seen)) break;
				seen = payload.issues.length;
			}
			if (key === "__proto__") continue;
			const el = shape[key];
			const optin = el._zod.optin;
			const optout = el._zod.optout;
			const r = el._zod.run({
				value: input[key],
				issues: []
			}, ctx);
			if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
			else handlePropertyResult(r, payload, key, input, optin, optout);
		}
		if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
		return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
	};
});
const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
	$ZodObject.init(inst, def);
	const superParse = inst._zod.parse;
	const _normalized = cached(() => normalizeDef(def));
	const memo = globalConfig.memoizer;
	const generateFastpass = (shape) => {
		const normalized = _normalized.value;
		const syms = normalized.symbolKeys;
		const doc = new Doc(["payload", "ctx"], {
			shape,
			inst,
			memo,
			syms
		});
		const parseStr = (k) => `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
		const prefixStr = (id, k) => `
          let ${id}_ab = false;
          for (let i = 0; i < ${id}.issues.length; i++) {
            const iss = ${id}.issues[i];
            iss.path = iss.path ? [${k}, ...iss.path] : [${k}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${id}_ab = true;
          }
          if (${id}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
		doc.write(`const input = payload.value;`);
		const ids = Object.create(null);
		let counter = 0;
		for (const key of normalized.allKeys) ids[key] = `key_${counter++}`;
		doc.write(memo ? `const newResult = memo.alloc(inst, payload, {}, ctx);` : `const newResult = {};`);
		for (const key of normalized.allKeys) {
			if (key === "__proto__") continue;
			const id = ids[key];
			const k = typeof key === "symbol" ? `syms[${syms.indexOf(key)}]` : esc(key);
			const isPresent = `${k} in input`;
			const schema = shape[key];
			const optin = schema?._zod?.optin;
			const isOptionalIn = optin !== void 0;
			const isOptionalOut = schema?._zod?.optout === "optional";
			doc.write(`const ${id} = ${parseStr(k)};`);
			if (isOptionalIn && isOptionalOut) {
				const assign = optin === "optional" ? `${id}_present` : `${id}.value !== undefined || ${id}_present`;
				doc.write(`
        const ${id}_present = ${isPresent};
        if (!${id}.issues.length || ${id}_present) {
          if (${id}.issues.length) {${prefixStr(id, k)}
          }

          if (${assign}) {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
			} else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${isPresent};
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${id}_present) {
          newResult[${k}] = ${id}.value;
        }

      `);
			else {
				doc.write(`
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
      `);
				if (optin === "defaulted") doc.write(`newResult[${k}] = ${id}.value;`);
				else doc.write(`
        if (${id}.value !== undefined || ${isPresent}) {
          newResult[${k}] = ${id}.value;
        }
      `);
			}
		}
		doc.write(`payload.value = newResult;`);
		doc.write(`return payload;`);
		return doc.compile();
	};
	let fastpass;
	const isObject$1 = isObject;
	const jit = !globalConfig.jitless;
	const fastEnabled = jit && allowsEval.value;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$1(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
			if (!fastpass) fastpass = generateFastpass(def.shape);
			payload = fastpass(payload, ctx);
			if (!catchall) return payload;
			return handleCatchall([], input, payload, ctx, value, inst, ctx?.abortEarly === true);
		}
		return superParse(payload, ctx);
	};
});
function handleUnionResults(results, final, inst, ctx) {
	for (const result of results) if (result.issues.length === 0) {
		final.value = result.value;
		return final;
	}
	const nonaborted = results.filter((r) => !aborted(r));
	if (nonaborted.length === 1) {
		final.value = nonaborted[0].value;
		return nonaborted[0];
	}
	final.issues.push({
		code: "invalid_union",
		input: final.value,
		inst,
		errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	});
	return final;
}
const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : zod.def.options.some((o) => o._zod.optin !== void 0) ? "optional" : void 0);
	defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
	defineLazyInternal(inst, "values", (zod) => {
		if (zod.def.options.every((o) => o._zod.values)) return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
	});
	defineLazyInternal(inst, "pattern", (zod) => {
		if (zod.def.options.every((o) => o._zod.pattern)) {
			const patterns = zod.def.options.map((o) => o._zod.pattern);
			return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
		}
	});
	const first = def.options.length === 1 ? def.options[0]._zod.run : null;
	inst._zod.parse = (payload, ctx) => {
		if (first) return first(payload, ctx);
		let async = false;
		const results = [];
		for (const option of def.options) {
			const result = option._zod.run({
				value: payload.value,
				issues: []
			}, ctx);
			if (result instanceof Promise) {
				results.push(result);
				async = true;
			} else {
				if (result.issues.length === 0) return result;
				results.push(result);
			}
		}
		if (!async) return handleUnionResults(results, payload, inst, ctx);
		return Promise.all(results).then((results) => {
			return handleUnionResults(results, payload, inst, ctx);
		});
	};
});
function discriminatorMap(def) {
	const map = /* @__PURE__ */ new Map();
	for (const option of def.options) {
		const values = option._zod.propValues?.[def.discriminator];
		if (!values || values.size === 0) throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
		for (const value of values) if (map.has(value)) {
			if (value !== void 0) throw new Error(`Duplicate discriminator value "${String(value)}"`);
			map.set(value, null);
		} else map.set(value, option);
	}
	return map;
}
const $ZodDiscriminatedUnion = /*@__PURE__*/ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
	def.inclusive = false;
	$ZodUnion.init(inst, def);
	const _super = inst._zod.parse;
	defineLazyInternal(inst, "propValues", (zod) => {
		const propValues = {};
		let undefinedCount = 0;
		for (const option of zod.def.options) {
			const pv = option._zod.propValues;
			if (!pv || Object.keys(pv).length === 0) throw new Error(`Invalid discriminated union option at index "${zod.def.options.indexOf(option)}"`);
			if (pv[zod.def.discriminator]?.has(void 0)) undefinedCount++;
			for (const [k, v] of Object.entries(pv)) {
				if (!Object.prototype.hasOwnProperty.call(propValues, k)) assignProp(propValues, k, /* @__PURE__ */ new Set());
				for (const val of v) propValues[k].add(val);
			}
		}
		if (!zod.def.unionFallback && undefinedCount > 1) propValues[zod.def.discriminator]?.delete(void 0);
		return propValues;
	});
	def.options.forEach((option, i) => {
		const propShape = rawShape(option._zod.def);
		if (propShape && !Object.prototype.hasOwnProperty.call(propShape, def.discriminator)) throw new Error(`Invalid discriminated union option at index "${i}"`);
	});
	const disc = cached(() => discriminatorMap(def));
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!isObject(input)) {
			payload.issues.push({
				code: "invalid_type",
				expected: "object",
				input,
				inst
			});
			return payload;
		}
		const value = input?.[def.discriminator];
		const opt = disc.value.get(value);
		if (opt && (value !== void 0 || ctx.direction !== "backward")) return opt._zod.run(payload, ctx);
		if (def.unionFallback || ctx.direction === "backward") return _super(payload, ctx);
		payload.issues.push({
			code: "invalid_union",
			errors: [],
			note: "No matching discriminator",
			discriminator: def.discriminator,
			options: Array.from(disc.value.keys()).filter((value) => disc.value.get(value) !== null),
			input,
			path: [def.discriminator],
			inst
		});
		return payload;
	};
});
const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		const left = def.left._zod.run({
			value: input,
			issues: []
		}, ctx);
		const right = def.right._zod.run({
			value: input,
			issues: []
		}, ctx);
		if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
			return handleIntersectionResults(payload, left, right);
		});
		return handleIntersectionResults(payload, left, right);
	};
});
function mergeValues(a, b) {
	if (a === b) return {
		valid: true,
		data: a
	};
	if (a instanceof Date && b instanceof Date && +a === +b) return {
		valid: true,
		data: a
	};
	if (isPlainObject$2(a) && isPlainObject$2(b)) {
		const bKeys = Object.keys(b);
		const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
		const newObj = {
			...a,
			...b
		};
		if (Object.prototype.hasOwnProperty.call(newObj, "__proto__")) delete newObj.__proto__;
		for (const key of sharedKeys) {
			if (key === "__proto__") continue;
			const sharedValue = mergeValues(a[key], b[key]);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
			};
			newObj[key] = sharedValue.data;
		}
		return {
			valid: true,
			data: newObj
		};
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return {
			valid: false,
			mergeErrorPath: []
		};
		const newArray = [];
		for (let index = 0; index < a.length; index++) {
			const itemA = a[index];
			const itemB = b[index];
			const sharedValue = mergeValues(itemA, itemB);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
			};
			newArray.push(sharedValue.data);
		}
		return {
			valid: true,
			data: newArray
		};
	}
	return {
		valid: false,
		mergeErrorPath: []
	};
}
function handleIntersectionResults(result, left, right) {
	const unrecKeys = /* @__PURE__ */ new Map();
	let unrecIssue;
	const keyIssues = /* @__PURE__ */ new Map();
	const collect = (iss, side) => {
		let keys;
		if (iss.code === "unrecognized_keys" && !iss.path?.length) {
			unrecIssue ?? (unrecIssue = iss);
			keys = iss.keys;
		} else if (iss.code === "invalid_key" && iss.origin === "record" && iss.path?.length === 1) {
			const k = String(iss.path[0]);
			if (!keyIssues.has(k)) keyIssues.set(k, iss);
			keys = [k];
		} else return false;
		for (const k of keys) {
			if (!unrecKeys.has(k)) unrecKeys.set(k, {});
			unrecKeys.get(k)[side] = true;
		}
		return true;
	};
	for (const iss of left.issues) if (!collect(iss, "l")) result.issues.push(iss);
	for (const iss of right.issues) if (!collect(iss, "r")) result.issues.push(iss);
	const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
	if (bothKeys.length) {
		const aggregated = unrecIssue ? bothKeys.filter((k) => unrecIssue.keys.includes(k)) : [];
		if (aggregated.length) result.issues.push({
			...unrecIssue,
			keys: aggregated
		});
		for (const k of bothKeys) if (!aggregated.includes(k) && keyIssues.has(k)) result.issues.push(keyIssues.get(k));
	}
	const merged = mergeValues(left.value, right.value);
	if (!merged.valid) {
		if (aborted(result)) return result;
		throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
	}
	result.value = merged.data;
	return result;
}
const $ZodRecord = /*@__PURE__*/ $constructor("$ZodRecord", (inst, def) => {
	$ZodType.init(inst, def);
	const memo = globalConfig.memoizer;
	memo?.attach(inst);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!isPlainObject$2(input)) {
			payload.issues.push({
				expected: "record",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		const proms = [];
		const values = def.keyType._zod.values;
		if (values && !def.partial) {
			payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
			const recordKeys = /* @__PURE__ */ new Set();
			for (const key of values) if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
				recordKeys.add(typeof key === "number" ? key.toString() : key);
				if (key === "__proto__") continue;
				const keyResult = def.keyType._zod.run({
					value: key,
					issues: []
				}, ctx);
				if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
				if (keyResult.issues.length) {
					payload.issues.push({
						code: "invalid_key",
						origin: "record",
						issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
						input: key,
						path: [key],
						inst
					});
					continue;
				}
				const outKey = keyResult.value;
				if (outKey === "__proto__") continue;
				const result = def.valueType._zod.run({
					value: input[key],
					issues: []
				}, ctx);
				if (result instanceof Promise) proms.push(result.then((result) => {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[outKey] = result.value;
				}));
				else {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[outKey] = result.value;
				}
			}
			let unrecognized;
			for (const key in input) if (!recordKeys.has(key)) {
				if (def.mode === "loose") {
					if (key === "__proto__") continue;
					payload.value[key] = input[key];
				} else {
					unrecognized = unrecognized ?? [];
					unrecognized.push(key);
				}
			}
			if (unrecognized && unrecognized.length > 0) payload.issues.push({
				code: "unrecognized_keys",
				input,
				inst,
				keys: unrecognized,
				continue: true
			});
		} else {
			payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
			let unrecognized;
			for (const key of Reflect.ownKeys(input)) {
				if (key === "__proto__") continue;
				if (!Object.prototype.propertyIsEnumerable.call(input, key)) continue;
				let keyResult = def.keyType._zod.run({
					value: key,
					issues: []
				}, ctx);
				if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
				if (typeof key === "string" && number$2.test(key) && keyResult.issues.length) {
					const retryResult = def.keyType._zod.run({
						value: Number(key),
						issues: []
					}, ctx);
					if (retryResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
					if (retryResult.issues.length === 0) keyResult = retryResult;
				}
				if (keyResult.issues.length) {
					if (def.mode === "loose") payload.value[key] = input[key];
					else if (values) {
						unrecognized = unrecognized ?? [];
						unrecognized.push(key);
					} else payload.issues.push({
						code: "invalid_key",
						origin: "record",
						issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
						input: key,
						path: [key],
						inst
					});
					continue;
				}
				const outKey = keyResult.value;
				if (outKey === "__proto__") continue;
				const result = def.valueType._zod.run({
					value: input[key],
					issues: []
				}, ctx);
				if (result instanceof Promise) proms.push(result.then((result) => {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[outKey] = result.value;
				}));
				else {
					if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
					payload.value[outKey] = result.value;
				}
			}
			if (unrecognized && unrecognized.length > 0) payload.issues.push({
				code: "unrecognized_keys",
				input,
				inst,
				keys: unrecognized,
				continue: true
			});
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
	$ZodType.init(inst, def);
	const values = getEnumValues(def.entries);
	const valuesSet = new Set(values);
	inst._zod.values = valuesSet;
	defineLazyInternal(inst, "pattern", (zod) => {
		const patternValues = getEnumValues(zod.def.entries).filter((k) => propertyKeyTypes.has(typeof k));
		return new RegExp(patternValues.length ? `^(${patternValues.map((o) => escapeRegex(o.toString())).join("|")})$` : "^[^\\s\\S]$");
	});
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (valuesSet.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values,
			input,
			inst
		});
		return payload;
	};
});
const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
	$ZodType.init(inst, def);
	const values = new Set(def.values);
	inst._zod.values = values;
	defineLazyInternal(inst, "pattern", (zod) => {
		const vals = zod.def.values;
		return new RegExp(vals.length ? `^(${vals.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$` : "^[^\\s\\S]$");
	});
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (values.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values: def.values,
			input,
			inst
		});
		return payload;
	};
});
const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	globalConfig.memoizer?.guard(inst);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		const _out = def.transform(payload.value, payload);
		if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
			payload.value = output;
			return payload;
		});
		if (_out instanceof Promise) throw new $ZodAsyncError();
		payload.value = _out;
		return payload;
	};
});
function handleOptionalResult(payload, result) {
	payload.value = result.issues.length ? void 0 : result.value;
	return payload;
}
const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
	inst._zod.optout = "optional";
	defineLazyInternal(inst, "values", (zod) => {
		const values = zod.def.innerType._zod.values;
		return values ? /* @__PURE__ */ new Set([...values, void 0]) : void 0;
	});
	defineLazyInternal(inst, "pattern", (zod) => {
		const pattern = zod.def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === void 0) {
			if (def.innerType._zod.optin !== "defaulted") return payload;
			const result = def.innerType._zod.run({
				value: payload.value,
				issues: []
			}, ctx);
			if (result instanceof Promise) return result.then((result) => handleOptionalResult(payload, result));
			return handleOptionalResult(payload, result);
		}
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
	defineLazyInternal(inst, "pattern", (zod) => zod.def.innerType._zod.pattern);
	inst._zod.parse = (payload, ctx) => {
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin);
	defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
	defineLazyInternal(inst, "pattern", (zod) => {
		const pattern = zod.def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
	});
	defineLazyInternal(inst, "values", (zod) => {
		return zod.def.innerType._zod.values ? /* @__PURE__ */ new Set([...zod.def.innerType._zod.values, null]) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === null) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "defaulted";
	defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) {
			payload.value = def.defaultValue;
			/**
			* $ZodDefault returns the default value immediately in forward direction.
			* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
			return payload;
		}
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
		return handleDefaultResult(result, def);
	};
});
function handleDefaultResult(payload, def) {
	if (payload.value === void 0) payload.value = def.defaultValue;
	return payload;
}
const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "defaulted";
	defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		if (payload.value === void 0) payload.value = def.defaultValue;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "values", (zod) => {
		const v = zod.def.innerType._zod.values;
		return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
		return handleNonOptionalResult(result, inst);
	};
});
function handleNonOptionalResult(payload, inst) {
	if (!payload.issues.length && payload.value === void 0) payload.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: payload.value,
		inst
	});
	return payload;
}
function handleCatchResult(payload, result, def, ctx) {
	if (!result.issues.length) {
		payload.value = result.value;
		if (result.memo) payload.memo = true;
		return payload;
	}
	payload.value = def.catchValue({
		...result,
		value: payload.value,
		error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
		input: payload.value
	});
	return payload;
}
const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
	defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
	defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run({
			value: payload.value,
			issues: []
		}, ctx);
		if (result instanceof Promise) return result.then((result) => handleCatchResult(payload, result, def, ctx));
		return handleCatchResult(payload, result, def, ctx);
	};
});
const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
	defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
	defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
	defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") {
			const right = def.out._zod.run(payload, ctx);
			if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
			return handlePipeResult(right, def.in, ctx);
		}
		const left = def.in._zod.run(payload, ctx);
		if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
		return handlePipeResult(left, def.out, ctx);
	};
});
function handlePipeResult(left, next, ctx) {
	if (left.issues.some((iss) => iss.code !== "unrecognized_keys")) {
		left.aborted = true;
		return left;
	}
	return next._zod.run({
		value: left.value,
		issues: left.issues
	}, ctx);
}
const $ZodPreprocess = /*@__PURE__*/ $constructor("$ZodPreprocess", (inst, def) => {
	$ZodPipe.init(inst, def);
});
const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
	defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
	defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
	defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
	inst._zod.parse = (payload, ctx) => {
		if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then(handleReadonlyResult);
		return handleReadonlyResult(result);
	};
});
function handleReadonlyResult(payload) {
	if (!payload.memo) payload.value = Object.freeze(payload.value);
	return payload;
}
const $ZodLazy = /*@__PURE__*/ $constructor("$ZodLazy", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "innerType", () => {
		const d = def;
		if (!d._cachedInner) d._cachedInner = def.getter();
		return d._cachedInner;
	});
	defineLazyInternal(inst, "pattern", (zod) => zod.innerType?._zod?.pattern);
	defineLazyInternal(inst, "propValues", (zod) => zod.innerType?._zod?.propValues);
	defineLazyInternal(inst, "optin", (zod) => zod.innerType?._zod?.optin ?? void 0);
	defineLazyInternal(inst, "optout", (zod) => zod.innerType?._zod?.optout ?? void 0);
	inst._zod.parse = (payload, ctx) => {
		return inst._zod.innerType._zod.run(payload, ctx);
	};
});
const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
	$ZodCheck.init(inst, def);
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _) => {
		return payload;
	};
	inst._zod.check = (payload) => {
		const input = payload.value;
		const r = def.fn(input);
		if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
		handleRefineResult(r, payload, input, inst);
	};
});
function handleRefineResult(result, payload, input, inst) {
	if (!result) {
		const _iss = {
			code: "custom",
			input,
			inst,
			path: [...inst._zod.def.path ?? []],
			continue: !inst._zod.def.abort
		};
		if (inst._zod.def.params) _iss.params = inst._zod.def.params;
		payload.issues.push(issue(_iss));
	}
}
//#endregion
//#region node_modules/zod/v4/core/memoizer.js
var $ZodCyclicError = class extends Error {
	constructor() {
		super(`Cannot parse a reference cycle that closes through a transform`);
		this.name = "ZodCyclicError";
	}
};
/** Keyed off the context object every schema in one parse call already shares. */
const STATE = "~memo";
const NO_ISSUES = [];
function isRef(value) {
	return value !== null && typeof value === "object";
}
function cloneIssues(issues) {
	return issues.map((iss) => iss.path ? {
		...iss,
		path: iss.path.slice()
	} : { ...iss });
}
const recursive = /*@__PURE__*/ new WeakMap();
/** What the walk established, in order of certainty: ordered so the strongest answer among children wins. */
const NONE = 0;
const ASSUMED = 1;
const PROVEN = 2;
/** Whether this schema's subtree contains a cycle, so one parse can re-enter it. */
function isRecursive(inst, stack, resolve) {
	const cached = recursive.get(inst);
	if (cached !== void 0) return cached ? PROVEN : NONE;
	if (stack.has(inst)) return PROVEN;
	stack.add(inst);
	let result = NONE;
	const check = (child) => {
		if (result !== PROVEN && child?._zod) {
			const answer = isRecursive(child, stack, resolve);
			if (answer > result) result = answer;
		}
	};
	const shape = (sh, spread) => {
		let answer = NONE;
		for (const key of Reflect.ownKeys(sh)) {
			const desc = Object.getOwnPropertyDescriptor(sh, key);
			if (spread && !desc.enumerable) continue;
			const child = desc.get ? ASSUMED : desc.value?._zod ? isRecursive(desc.value, stack, resolve) : NONE;
			if (child > answer) answer = child;
		}
		return answer;
	};
	const merge = (answer) => {
		if (answer > result) result = answer;
	};
	const def = inst._zod.def;
	switch (def.type) {
		case "object": {
			const raw = rawShape(def);
			merge(raw ? shape(raw, true) : ASSUMED);
			check(def.catchall);
			break;
		}
		case "array":
			check(def.element);
			break;
		case "tuple":
			for (const el of def.items) check(el);
			check(def.rest);
			break;
		case "record":
		case "map":
			check(def.keyType);
			check(def.valueType);
			break;
		case "set":
			check(def.valueType);
			break;
		case "union":
			for (const el of def.options) check(el);
			break;
		case "intersection":
			check(def.left);
			check(def.right);
			break;
		case "optional":
		case "nullable":
		case "default":
		case "prefault":
		case "catch":
		case "readonly":
		case "nonoptional":
		case "promise":
		case "success":
			check(def.innerType);
			break;
		case "pipe":
			check(def.in);
			check(def.out);
			break;
		case "function":
			check(def.input);
			check(def.output);
			break;
		case "lazy": {
			const inner = def._cachedInner ?? (resolve ? inst._zod.innerType : void 0);
			merge(inner ? isRecursive(inner, stack, false) : ASSUMED);
			break;
		}
		case "template_literal":
		case "string":
		case "number":
		case "int":
		case "boolean":
		case "bigint":
		case "symbol":
		case "undefined":
		case "null":
		case "void":
		case "never":
		case "any":
		case "unknown":
		case "date":
		case "nan":
		case "enum":
		case "literal":
		case "file":
		case "transform":
		case "custom": break;
		default: for (const key in def) {
			const desc = Object.getOwnPropertyDescriptor(def, key);
			if (!desc || desc.get) continue;
			const value = desc.value;
			if (!value || typeof value !== "object") continue;
			if (value._zod) check(value);
			else if (Array.isArray(value)) for (const el of value) check(el);
		}
	}
	stack.delete(inst);
	return settle(inst, result);
}
/** An assumed answer must not outlive the resolution that settles it, so only a certain one is cached. */
function settle(inst, answer) {
	if (answer !== ASSUMED) recursive.set(inst, answer === PROVEN);
	return answer;
}
function bucketFor(state, inst) {
	let bucket = state.buckets.get(inst);
	if (!bucket) {
		bucket = /* @__PURE__ */ new WeakMap();
		state.buckets.set(inst, bucket);
	}
	return bucket;
}
let handoff;
const open = [];
const memo$2 = {
	alloc(_inst, payload, empty) {
		const bucket = handoff;
		if (!bucket) return empty;
		handoff = void 0;
		const entry = {
			value: empty,
			issues: null
		};
		bucket.set(payload.value, entry);
		open.push(entry);
		return empty;
	},
	guard(inst) {
		var _a;
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred.push(() => {
			const base = inst._zod.parse;
			const wrapped = (payload, ctx) => {
				if (ctx.direction !== "backward" && isBackEdge(ctx, payload.value)) throw new $ZodCyclicError();
				return base(payload, ctx);
			};
			inst._zod.parse = wrapped;
			if (inst._zod.run === base) inst._zod.run = wrapped;
		});
	},
	attach(inst) {
		var _a;
		let isRecursiveInst;
		let rechecked = false;
		let lastCtx;
		let lastBucket;
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred.push(() => {
			const base = inst._zod.parse;
			const wrapped = (payload, ctx) => {
				if (isRecursiveInst === void 0) {
					const walked = isRecursive(inst, /* @__PURE__ */ new Set(), false);
					if (walked === NONE) {
						inst._zod.parse = base;
						if (inst._zod.run === wrapped) inst._zod.run = base;
						return base(payload, ctx);
					}
					if (walked === PROVEN || rechecked) isRecursiveInst = true;
					else rechecked = true;
				}
				const input = payload.value;
				if (!isRef(input)) return base(payload, ctx);
				let state = ctx[STATE];
				if (!state) {
					state = {
						buckets: /* @__PURE__ */ new WeakMap(),
						backEdges: void 0
					};
					ctx[STATE] = state;
				}
				let bucket;
				if (lastCtx === ctx) bucket = lastBucket;
				else {
					bucket = bucketFor(state, inst);
					lastCtx = ctx;
					lastBucket = bucket;
				}
				const hit = bucket.get(input);
				if (hit) {
					payload.value = hit.value;
					if (hit.issues) {
						if (hit.issues.length) payload.issues.push(...cloneIssues(hit.issues));
					} else {
						payload.memo = true;
						state.backEdges ?? (state.backEdges = /* @__PURE__ */ new WeakSet());
						state.backEdges.add(hit.value);
					}
					return payload;
				}
				handoff = bucket;
				const depth = open.length;
				const result = base(payload, ctx);
				handoff = void 0;
				const entry = open.length > depth ? open.pop() : void 0;
				if (result instanceof Promise) return result.then((r) => {
					if (entry) entry.issues = r.issues.length ? cloneIssues(r.issues) : NO_ISSUES;
					return r;
				});
				if (entry) entry.issues = result.issues.length ? cloneIssues(result.issues) : NO_ISSUES;
				return result;
			};
			inst._zod.parse = wrapped;
			if (inst._zod.run === base) inst._zod.run = wrapped;
		});
	}
};
/** The memoizer that gives containers cycle support. `zod` installs it by default; `zod/mini` opts in with `config({ memoizer: memoizer() })`. */
function memoizer() {
	return memo$2;
}
/** Whether this value is a node a back-edge resolved to before it finished. */
function isBackEdge(ctx, value) {
	const backEdges = ctx[STATE]?.backEdges;
	return backEdges !== void 0 && isRef(value) && backEdges.has(value);
}
//#endregion
//#region node_modules/zod/v4/locales/en.js
const error = () => {
	const Sizable = {
		string: {
			unit: "characters",
			verb: "to have"
		},
		file: {
			unit: "bytes",
			verb: "to have"
		},
		array: {
			unit: "items",
			verb: "to have"
		},
		set: {
			unit: "items",
			verb: "to have"
		},
		map: {
			unit: "entries",
			verb: "to have"
		}
	};
	function getSizing(origin) {
		return Sizable[origin] ?? null;
	}
	const FormatDictionary = {
		regex: "input",
		email: "email address",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO datetime",
		date: "ISO date",
		time: "ISO time",
		duration: "ISO duration",
		ipv4: "IPv4 address",
		ipv6: "IPv6 address",
		mac: "MAC address",
		cidrv4: "IPv4 range",
		cidrv6: "IPv6 range",
		base64: "base64-encoded string",
		base64url: "base64url-encoded string",
		json_string: "JSON string",
		e164: "E.164 number",
		currency_code: "currency code",
		credit_card: "credit card number",
		iban: "IBAN",
		jwt: "JWT",
		template_literal: "input"
	};
	const TypeDictionary = { nan: "NaN" };
	function getTypeName(type, input) {
		if (type === "number" && typeof input === "number" && !Number.isFinite(input)) return String(input);
		return TypeDictionary[type] ?? type;
	}
	return (issue) => {
		switch (issue.code) {
			case "invalid_type": return `Invalid input: expected ${getTypeName(issue.expected)}, received ${getTypeName(parsedType(issue.input), issue.input)}`;
			case "invalid_value":
				if (issue.values.length === 1) return `Invalid input: expected ${stringifyPrimitive(issue.values[0])}`;
				return `Invalid option: expected one of ${joinValues(issue.values, "|")}`;
			case "too_big": {
				const adj = issue.exact ? "exactly " : issue.inclusive ? "<=" : "<";
				const sizing = getSizing(issue.origin);
				if (sizing) return `Too big: expected ${issue.origin ?? "value"} to have ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elements"}`;
				return `Too big: expected ${issue.origin ?? "value"} to be ${adj}${issue.maximum.toString()}`;
			}
			case "too_small": {
				const adj = issue.exact ? "exactly " : issue.inclusive ? ">=" : ">";
				const sizing = getSizing(issue.origin);
				if (sizing) return `Too small: expected ${issue.origin} to have ${adj}${issue.minimum.toString()} ${sizing.unit}`;
				return `Too small: expected ${issue.origin} to be ${adj}${issue.minimum.toString()}`;
			}
			case "invalid_format": {
				const _issue = issue;
				if (_issue.format === "starts_with") return `Invalid string: must start with "${_issue.prefix}"`;
				if (_issue.format === "ends_with") return `Invalid string: must end with "${_issue.suffix}"`;
				if (_issue.format === "includes") return `Invalid string: must include "${_issue.includes}"`;
				if (_issue.format === "regex") return `Invalid string: must match pattern ${_issue.pattern}`;
				return `Invalid ${FormatDictionary[_issue.format] ?? issue.format}`;
			}
			case "not_multiple_of": return `Invalid number: must be a multiple of ${issue.divisor}`;
			case "unrecognized_keys": return `Unrecognized key${issue.keys.length > 1 ? "s" : ""}: ${joinValues(issue.keys, ", ")}`;
			case "invalid_key": return `Invalid key in ${issue.origin}`;
			case "invalid_union":
				if (issue.options && Array.isArray(issue.options) && issue.options.length > 0) return `Invalid discriminator value. Expected ${issue.options.map((o) => `'${o}'`).join(" | ")}`;
				if (issue.inclusive === false) return "Invalid input: more than one option matched";
				return "Invalid input";
			case "invalid_element": return `Invalid value in ${issue.origin}`;
			default: return `Invalid input`;
		}
	};
};
function en_default() {
	return { localeError: error() };
}
//#endregion
//#region node_modules/zod/v4/core/registries.js
var _a;
var $ZodRegistry = class {
	constructor() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
	}
	add(schema, ..._meta) {
		const meta = _meta[0];
		this._map.set(schema, meta);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
		return this;
	}
	clear() {
		this._map = /* @__PURE__ */ new WeakMap();
		this._idmap = /* @__PURE__ */ new Map();
		return this;
	}
	remove(schema) {
		const meta = this._map.get(schema);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
		this._map.delete(schema);
		return this;
	}
	get(schema) {
		const p = schema._zod.parent;
		if (p) {
			const pm = { ...this.get(p) ?? {} };
			delete pm.id;
			const f = {
				...pm,
				...this._map.get(schema)
			};
			return Object.keys(f).length ? f : void 0;
		}
		return this._map.get(schema);
	}
	has(schema) {
		return this._map.has(schema);
	}
};
function registry() {
	return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
const globalRegistry = globalThis.__zod_globalRegistry;
//#endregion
//#region node_modules/zod/v4/core/api.js
function snapshotChecks(def) {
	if (def.checks) def.checks = [...def.checks];
	return def;
}
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
	return new Class(snapshotChecks({
		type: "string",
		...normalizeParams(params)
	}));
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
	return new Class({
		type: "string",
		format: "email",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
	return new Class({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v4",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v6",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v7",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
	return new Class({
		type: "string",
		format: "url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
	return new Class({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
	return new Class({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link _cuid2} instead.
* See https://github.com/paralleldrive/cuid.
*/
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
	return new Class({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
	return new Class({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
	return new Class({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
	return new Class({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
	return new Class({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
	return new Class({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
	return new Class({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
	return new Class({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
	return new Class({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
	return new Class({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
	return new Class({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
	return new Class({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: false,
		local: false,
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
	return new Class({
		type: "string",
		format: "date",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
	return new Class({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
	return new Class({
		type: "string",
		format: "duration",
		check: "string_format",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
	return new Class(snapshotChecks({
		type: "number",
		checks: [],
		...normalizeParams(params)
	}));
}
// @__NO_SIDE_EFFECTS__
function _coercedNumber(Class, params) {
	return new Class(snapshotChecks({
		type: "number",
		coerce: true,
		checks: [],
		...normalizeParams(params)
	}));
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
	return new Class({
		type: "number",
		check: "number_format",
		abort: false,
		format: "safeint",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
	return new Class({
		type: "boolean",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _null$1(Class, params) {
	return new Class({
		type: "null",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _any(Class) {
	return new Class({ type: "any" });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
	return new Class({ type: "unknown" });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
	return new Class({
		type: "never",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
	return new $ZodCheckMultipleOf({
		check: "multiple_of",
		...normalizeParams(params),
		value
	});
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
	return new $ZodCheckMaxLength({
		check: "max_length",
		...normalizeParams(params),
		maximum
	});
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
	return new $ZodCheckMinLength({
		check: "min_length",
		...normalizeParams(params),
		minimum
	});
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
	return new $ZodCheckLengthEquals({
		check: "length_equals",
		...normalizeParams(params),
		length
	});
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
	return new $ZodCheckRegex({
		check: "string_format",
		format: "regex",
		...normalizeParams(params),
		pattern
	});
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
	return new $ZodCheckLowerCase({
		check: "string_format",
		format: "lowercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
	return new $ZodCheckUpperCase({
		check: "string_format",
		format: "uppercase",
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
	return new $ZodCheckIncludes({
		check: "string_format",
		format: "includes",
		...normalizeParams(params),
		includes
	});
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
	return new $ZodCheckStartsWith({
		check: "string_format",
		format: "starts_with",
		...normalizeParams(params),
		prefix
	});
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
	return new $ZodCheckEndsWith({
		check: "string_format",
		format: "ends_with",
		...normalizeParams(params),
		suffix
	});
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
	return new $ZodCheckOverwrite({
		check: "overwrite",
		tx
	});
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
	return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
	return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
	return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
	return /* @__PURE__ */ _overwrite((input) => slugify$1(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
	return new Class({
		type: "array",
		element,
		...normalizeParams(params)
	});
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
	return new Class({
		type: "custom",
		check: "custom",
		fn,
		...normalizeParams(_params)
	});
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
	const ch = /* @__PURE__ */ _check((payload) => {
		payload.addIssue = (issue$2) => {
			if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
			else {
				const _issue = issue$2;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				if (!("input" in _issue)) _issue.input = payload.value;
				_issue.inst ?? (_issue.inst = ch);
				_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
				payload.issues.push(issue(_issue));
			}
		};
		return fn(payload.value, payload);
	}, params);
	return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
	const ch = new $ZodCheck({
		check: "custom",
		...normalizeParams(params)
	});
	ch._zod.check = fn;
	return ch;
}
//#endregion
//#region node_modules/zod/v4/core/to-json-schema.js
function assignProps(target, ...sources) {
	for (const source of sources) for (const key of Reflect.ownKeys(source)) if (Object.prototype.propertyIsEnumerable.call(source, key)) assignProp(target, key, source[key]);
	return target;
}
function initializeContext(params) {
	let target = params?.target ?? "draft-2020-12";
	if (target === "draft-4") target = "draft-04";
	if (target === "draft-7") target = "draft-07";
	return {
		processors: params.processors ?? {},
		metadataRegistry: params?.metadata ?? globalRegistry,
		target,
		unrepresentable: params?.unrepresentable ?? "throw",
		override: params?.override ?? (() => {}),
		io: params?.io ?? "output",
		counter: 0,
		seen: /* @__PURE__ */ new Map(),
		sharedDefsExtractedFor: void 0,
		sharedEmitDoneFor: void 0,
		cycles: params?.cycles ?? "ref",
		reused: params?.reused ?? "inline",
		intersections: [],
		deferred: [],
		external: params?.external ?? void 0
	};
}
/**
* Applies the `unrepresentable` setting at a site that has no JSON Schema equivalent. Throws
* `message` unless the setting (or the handler's return value) says otherwise. Returns `true` if a
* custom JSON Schema was written into `json`, in which case the caller must not write its own.
*/
function handleUnrepresentable(schema, ctx, json, params, message) {
	const result = typeof ctx.unrepresentable === "function" ? ctx.unrepresentable({
		zodSchema: schema,
		path: params.path,
		message
	}) : ctx.unrepresentable;
	if (result === "any") return false;
	if (result === void 0 || result === "throw") throw new Error(message);
	Object.assign(json, result);
	return true;
}
function processSchema(schema, ctx, _params = {
	path: [],
	schemaPath: []
}) {
	var _a;
	const def = schema._zod.def;
	const seen = ctx.seen.get(schema);
	if (seen) {
		seen.count++;
		if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
		return seen.schema;
	}
	const result = {
		schema: {},
		count: 1,
		cycle: void 0,
		path: _params.path
	};
	ctx.seen.set(schema, result);
	ctx.sharedDefsExtractedFor = void 0;
	ctx.sharedEmitDoneFor = void 0;
	const overrideSchema = schema._zod.toJSONSchema?.();
	if (overrideSchema) result.schema = overrideSchema;
	else {
		const params = {
			..._params,
			schemaPath: [..._params.schemaPath, schema],
			path: _params.path
		};
		if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
		else {
			const _json = result.schema;
			const processor = ctx.processors[def.type];
			if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
			processor(schema, ctx, _json, params);
		}
		const parent = schema._zod.parent;
		if (parent) {
			if (!result.ref) result.ref = parent;
			processSchema(parent, ctx, params);
			ctx.seen.get(parent).isParent = true;
		}
	}
	const meta = ctx.metadataRegistry.get(schema);
	if (meta) assignProps(result.schema, meta);
	if (ctx.io === "input" && isTransforming(schema)) {
		delete result.schema.examples;
		delete result.schema.default;
	}
	if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
	delete result.schema._prefault;
	return ctx.seen.get(schema).schema;
}
function encodeJSONPointerSegment(segment) {
	return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
function extractDefs(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	if (ctx.external && ctx.sharedDefsExtractedFor === ctx.external) return;
	const idToSchema = /* @__PURE__ */ new Map();
	for (const entry of ctx.seen.entries()) {
		const id = ctx.metadataRegistry.get(entry[0])?.id;
		if (id) {
			const existing = idToSchema.get(id);
			if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
			idToSchema.set(id, entry[0]);
		}
	}
	const makeURI = (entry) => {
		const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
		if (ctx.external) {
			const externalId = ctx.external.registry.get(entry[0])?.id;
			const uriGenerator = ctx.external.uri ?? ((id) => id);
			if (externalId) return { ref: uriGenerator(externalId) };
			const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
			entry[1].defId = id;
			return {
				defId: id,
				ref: `${uriGenerator("__shared")}#/${defsSegment}/${encodeJSONPointerSegment(id)}`
			};
		}
		const uriPrefix = `#`;
		const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
		if (entry[1] === root && !entry[1].schema.id) return { ref: uriPrefix };
		const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
		return {
			defId,
			ref: defUriPrefix + encodeJSONPointerSegment(defId)
		};
	};
	const extractToDef = (entry) => {
		if (entry[1].schema.$ref) return;
		const seen = entry[1];
		const { ref, defId } = makeURI(entry);
		seen.def = { ...seen.schema };
		if (defId) seen.defId = defId;
		const schema = seen.schema;
		for (const key in schema) delete schema[key];
		schema.$ref = ref;
	};
	if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
	}
	for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (schema === entry[0]) {
			extractToDef(entry);
			continue;
		}
		if (ctx.external) {
			const ext = ctx.external.registry.get(entry[0])?.id;
			if (schema !== entry[0] && ext) {
				extractToDef(entry);
				continue;
			}
		}
		if (ctx.metadataRegistry.get(entry[0])?.id) {
			extractToDef(entry);
			continue;
		}
		if (seen.cycle) {
			extractToDef(entry);
			continue;
		}
		if (seen.count > 1) {
			if (ctx.reused === "ref") extractToDef(entry);
		}
	}
	if (ctx.external) ctx.sharedDefsExtractedFor = ctx.external;
}
/** Rewrites `anyOf: [{type: "a"}, {type: "b"}]` to `type: ["a", "b"]`, which every JSON Schema draft treats as equivalent and most consumers render far better for the nullable case. Only branches that are a bare type assertion qualify — anything carrying a constraint, `$ref`, `const` or metadata is left alone. Runs after `flattenRef`, so a branch an override decorated or `$defs` extraction turned into a `$ref` is no longer bare and correctly stays in `anyOf`. `oneOf` is excluded: `integer` and `number` overlap, so "exactly one" and "at least one" are not the same there. OpenAPI 3.0 is excluded: its `type` must be a single string. */
function compactTypeUnion(schema) {
	const options = schema.anyOf;
	if (!Array.isArray(options) || options.length === 0 || schema.type !== void 0) return;
	const types = [];
	for (const option of options) {
		if (!option || typeof option !== "object") return;
		compactTypeUnion(option);
		const keys = Object.keys(option);
		if (keys.length !== 1 || keys[0] !== "type") return;
		const type = option.type;
		for (const member of Array.isArray(type) ? type : [type]) {
			if (typeof member !== "string") return;
			if (!types.includes(member)) types.push(member);
		}
	}
	delete schema.anyOf;
	schema.type = types.length === 1 ? types[0] : types;
}
/** Keywords `foldIntersection` knows how to combine. Anything else — `$ref`, `patternProperties`,
* an annotation like `description` — makes a member unfoldable, so a constraint this does not
* understand leaves the `allOf` alone instead of being silently dropped or misattributed. */
const FOLDABLE_KEYS = /* @__PURE__ */ new Set([
	"type",
	"properties",
	"required",
	"additionalProperties"
]);
const UNION_KEYS = ["oneOf", "anyOf"];
/** A member's constraint on a key it does not declare itself. A `catchall` states one; `false`, an absent `additionalProperties`, and the empty schema a loose object emits state nothing. */
function undeclaredConstraint(member) {
	const extra = member.additionalProperties;
	if (extra === void 0 || extra === false || typeof extra !== "object" || extra === null) return null;
	return Object.keys(extra).length ? extra : null;
}
/** Combines object members into the single object they describe together, or returns `null` if any of them carries a keyword outside {@link FOLDABLE_KEYS}. */
function foldObjects(members) {
	const objects = [];
	for (const member of members) {
		if (typeof member !== "object" || member.type !== "object") return null;
		for (const key in member) if (!FOLDABLE_KEYS.has(key)) return null;
		objects.push(member);
	}
	const properties = {};
	const required = /* @__PURE__ */ new Set();
	for (const object of objects) {
		for (const key in object.properties) {
			if (Object.prototype.hasOwnProperty.call(properties, key)) continue;
			const parts = [];
			for (const other of objects) {
				const part = other.properties?.[key] ?? undeclaredConstraint(other);
				if (part === null || part === void 0) continue;
				if (!parts.some((seen) => JSON.stringify(seen) === JSON.stringify(part))) parts.push(part);
			}
			assignProp(properties, key, parts.length === 1 ? parts[0] : foldObjects(parts) ?? { allOf: parts });
		}
		for (const key of object.required ?? []) required.add(key);
	}
	const folded = {
		type: "object",
		properties
	};
	if (required.size) folded.required = [...required];
	if (objects.every((object) => object.additionalProperties === false)) folded.additionalProperties = false;
	else {
		const constraints = [];
		for (const object of objects) {
			const constraint = undeclaredConstraint(object);
			if (constraint && !constraints.some((seen) => JSON.stringify(seen) === JSON.stringify(constraint))) constraints.push(constraint);
		}
		if (constraints.length === 1) folded.additionalProperties = constraints[0];
		else if (constraints.length > 1) folded.additionalProperties = { allOf: constraints };
	}
	return folded;
}
/** `additionalProperties` in an `allOf` member sees only that member's own `properties`, so two
* closed object members reject each other's keys and the schema validates nothing. Zod's parser
* pools the key sets instead — `handleIntersectionResults` reports a key as unrecognized only when
* *every* side rejects it — so the emitted schema has to pool them too, and folding the members
* into one object is the encoding that says so on every target.
*
* This runs from `finalize`, after `extractDefs`, which is what keeps it clear of the `$ref`
* machinery: a member extracted into `$defs` is already a `$ref` by now and declines to fold, so it
* keeps its reference and its own closedness rather than being inlined as a stale copy. */
function foldIntersection(json) {
	const allOf = json.allOf;
	if (!Array.isArray(allOf) || allOf.length < 2) return;
	for (const key of FOLDABLE_KEYS) if (key in json) return;
	const unions = allOf.filter((m) => UNION_KEYS.some((k) => Array.isArray(m[k])));
	let folded = null;
	if (!unions.length) folded = foldObjects(allOf);
	else {
		const union = unions[0];
		const keyword = UNION_KEYS.find((k) => Array.isArray(union[k]));
		if (Object.keys(union).length !== 1) return;
		const rest = allOf.filter((m) => m !== union);
		const branches = union[keyword].map((branch) => foldObjects([...rest, branch]));
		if (branches.some((b) => !b)) return;
		folded = { [keyword]: branches };
	}
	if (!folded) return;
	delete json.allOf;
	assignProps(json, folded);
}
function finalize(ctx, schema) {
	const root = ctx.seen.get(schema);
	if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
	const flattenRef = (zodSchema) => {
		const seen = ctx.seen.get(zodSchema);
		if (seen.ref === null) return;
		const schema = seen.def ?? seen.schema;
		const _cached = { ...schema };
		const ref = seen.ref;
		seen.ref = null;
		if (ref) {
			flattenRef(ref);
			const refSeen = ctx.seen.get(ref);
			const refSchema = refSeen.schema;
			if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
				schema.allOf = schema.allOf ?? [];
				schema.allOf.push(refSchema);
			} else assignProps(schema, refSchema);
			assignProps(schema, _cached);
			if (zodSchema._zod.parent === ref) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (!(key in _cached)) delete schema[key];
			}
			if (refSchema.$ref && refSeen.def) for (const key in schema) {
				if (key === "$ref" || key === "allOf") continue;
				if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
			}
		}
		const parent = zodSchema._zod.parent;
		if (parent && parent !== ref) {
			flattenRef(parent);
			const parentSeen = ctx.seen.get(parent);
			if (parentSeen?.schema.$ref) {
				schema.$ref = parentSeen.schema.$ref;
				if (parentSeen.def) for (const key in schema) {
					if (key === "$ref" || key === "allOf") continue;
					if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
				}
			}
		}
		ctx.override({
			zodSchema,
			jsonSchema: schema,
			path: seen.path ?? []
		});
	};
	if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
		for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
		if (ctx.target !== "openapi-3.0") for (const entry of ctx.seen.entries()) compactTypeUnion(entry[1].def ?? entry[1].schema);
		for (const rewrite of ctx.deferred) rewrite();
		if (ctx.intersections.length) {
			const carriers = /* @__PURE__ */ new Map();
			for (const seen of ctx.seen.values()) for (const json of [seen.schema, seen.def]) {
				const allOf = json?.allOf;
				if (!Array.isArray(allOf)) continue;
				const existing = carriers.get(allOf);
				if (existing) existing.push(json);
				else carriers.set(allOf, [json]);
			}
			for (const allOf of ctx.intersections) for (const json of carriers.get(allOf) ?? []) foldIntersection(json);
		}
	}
	const result = {};
	if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
	else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
	else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
	else if (ctx.target === "openapi-3.0") {}
	if (ctx.external?.uri) {
		const id = ctx.external.registry.get(schema)?.id;
		if (!id) throw new Error("Schema is missing an `id` property");
		result.$id = ctx.external.uri(id);
	}
	assignProps(result, root.defId ? root.schema : root.def ?? root.schema);
	const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
	if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
	const defs = ctx.external?.defs ?? {};
	if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) for (const entry of ctx.seen.entries()) {
		const seen = entry[1];
		if (seen.def && seen.defId) {
			if (seen.def.id === seen.defId) delete seen.def.id;
			assignProp(defs, seen.defId, seen.def);
		}
	}
	if (ctx.external) ctx.sharedEmitDoneFor = ctx.external;
	if (ctx.external) {} else if (Object.keys(defs).length > 0) {
		if (ctx.target === "draft-2020-12") result.$defs = defs;
		else result.definitions = defs;
	}
	try {
		const finalized = JSON.parse(JSON.stringify(result));
		Object.defineProperty(finalized, "~standard", {
			value: {
				...schema["~standard"],
				jsonSchema: {
					input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
					output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
				}
			},
			enumerable: false,
			writable: false
		});
		return finalized;
	} catch (_err) {
		throw new Error("Error converting schema to JSON.");
	}
}
function isTransforming(_schema, _ctx) {
	const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
	if (ctx.seen.has(_schema)) return false;
	ctx.seen.add(_schema);
	const def = _schema._zod.def;
	if (def.type === "transform") return true;
	if (def.type === "array") return isTransforming(def.element, ctx);
	if (def.type === "set") return isTransforming(def.valueType, ctx);
	if (def.type === "lazy") return isTransforming(def.getter(), ctx);
	if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault" || def.type === "catch") return isTransforming(def.innerType, ctx);
	if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
	if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
	if (def.type === "pipe") {
		if (_schema._zod.traits.has("$ZodCodec")) return true;
		return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
	}
	if (def.type === "object") {
		for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
		return false;
	}
	if (def.type === "union") {
		for (const option of def.options) if (isTransforming(option, ctx)) return true;
		return false;
	}
	if (def.type === "tuple") {
		for (const item of def.items) if (isTransforming(item, ctx)) return true;
		if (def.rest && isTransforming(def.rest, ctx)) return true;
		return false;
	}
	return false;
}
/**
* Creates a toJSONSchema method for a schema instance.
* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
*/
const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
	const ctx = initializeContext({
		...params,
		processors
	});
	processSchema(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};
const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
	const { libraryOptions, target } = params ?? {};
	const ctx = initializeContext({
		...libraryOptions ?? {},
		target,
		io,
		processors
	});
	processSchema(schema, ctx);
	extractDefs(ctx, schema);
	return finalize(ctx, schema);
};
//#endregion
//#region node_modules/zod/v4/core/json-schema-processors.js
const narrowMin = (agg, key, value) => {
	if (agg[key] === void 0 || value > agg[key]) agg[key] = value;
};
const narrowMax = (agg, key, value) => {
	if (agg[key] === void 0 || value < agg[key]) agg[key] = value;
};
const narrowBoth = (agg, value) => {
	narrowMin(agg, "minimum", value);
	narrowMax(agg, "maximum", value);
};
const addDivisor = (agg, value) => {
	agg.multipleOf ?? (agg.multipleOf = []);
	if (!agg.multipleOf.includes(value)) agg.multipleOf.push(value);
};
const addPattern = (agg, pattern) => {
	agg.patterns ?? (agg.patterns = /* @__PURE__ */ new Set());
	agg.patterns.add(pattern);
};
const intersectMime = (agg, mime) => {
	agg.mime = agg.mime ? agg.mime.filter((m) => mime.includes(m)) : [...mime];
};
const setFormat = (agg, format) => {
	agg.format = format;
	if (format.includes("int")) agg.isInt = true;
};
const minContributor = (agg, def) => narrowMin(agg, "minimum", def.minimum);
const maxContributor = (agg, def) => narrowMax(agg, "maximum", def.maximum);
const formatContributor = (ranges) => (agg, def) => {
	setFormat(agg, def.format);
	const [minimum, maximum] = ranges[def.format];
	narrowMin(agg, "minimum", minimum);
	narrowMax(agg, "maximum", maximum);
};
const contributors = {
	greater_than: (agg, def) => narrowMin(agg, def.inclusive ? "minimum" : "exclusiveMinimum", def.value),
	less_than: (agg, def) => narrowMax(agg, def.inclusive ? "maximum" : "exclusiveMaximum", def.value),
	multiple_of: (agg, def) => addDivisor(agg, def.value),
	number_format: formatContributor(NUMBER_FORMAT_RANGES),
	bigint_format: formatContributor(BIGINT_FORMAT_RANGES),
	min_length: minContributor,
	max_length: maxContributor,
	length_equals: (agg, def) => narrowBoth(agg, def.length),
	min_size: minContributor,
	max_size: maxContributor,
	size_equals: (agg, def) => narrowBoth(agg, def.size),
	string_format: (agg, def) => {
		setFormat(agg, def.format);
		if (def.pattern) addPattern(agg, def.pattern);
		if (def.format === "base64" || def.format === "base64url") agg.contentEncoding = def.format;
		if (def.local || def.precision === -1) agg.laxFormat = true;
	},
	mime_type: (agg, def) => intersectMime(agg, def.mime)
};
function aggregateChecks(schema) {
	const agg = {};
	const def = schema._zod.def;
	const list = schema._zod.traits.has("$ZodCheck") ? [schema, ...def.checks ?? []] : def.checks ?? [];
	for (const ch of list) contributors[ch._zod.def.check]?.(agg, ch._zod.def);
	const bag = schema._zod.bag;
	if (bag.minimum !== void 0) narrowMin(agg, "minimum", bag.minimum);
	if (bag.exclusiveMinimum !== void 0) narrowMin(agg, "exclusiveMinimum", bag.exclusiveMinimum);
	if (bag.maximum !== void 0) narrowMax(agg, "maximum", bag.maximum);
	if (bag.exclusiveMaximum !== void 0) narrowMax(agg, "exclusiveMaximum", bag.exclusiveMaximum);
	if (bag.multipleOf !== void 0) addDivisor(agg, bag.multipleOf);
	if (bag.format !== void 0) {
		agg.format ?? (agg.format = bag.format);
		if (bag.format.includes("int")) agg.isInt = true;
	}
	if (bag.mime) intersectMime(agg, bag.mime);
	for (const pattern of bag.patterns ?? []) addPattern(agg, pattern);
	return agg;
}
const formatMap = {
	guid: "uuid",
	url: "uri",
	datetime: "date-time",
	json_string: "json-string",
	regex: ""
};
const exactPatterns = /* @__PURE__ */ new Map([[base64Charset, base64], [base64urlCharset, base64url]]);
const exactPattern = (p) => exactPatterns.get(p) ?? p;
const stringProcessor = (schema, ctx, _json, _params) => {
	const json = _json;
	json.type = "string";
	const { minimum, maximum, format, patterns, contentEncoding, laxFormat } = aggregateChecks(schema);
	if (typeof minimum === "number") json.minLength = minimum;
	if (typeof maximum === "number") json.maxLength = maximum;
	if (format) {
		json.format = formatMap[format] ?? format;
		if (json.format === "") delete json.format;
		if (format === "time" || laxFormat) delete json.format;
	}
	if (contentEncoding) json.contentEncoding = contentEncoding;
	if (patterns && patterns.size > 0) {
		const patternList = [...patterns].map(exactPattern);
		if (patternList.length === 1) json.pattern = patternList[0].source;
		else if (patternList.length > 1) json.allOf = [...patternList.map((regex) => ({
			...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
			pattern: regex.source
		}))];
	}
};
const numberProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const { minimum, maximum, multipleOf, exclusiveMaximum, exclusiveMinimum, isInt } = aggregateChecks(schema);
	json.type = isInt ? "integer" : "number";
	const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
	const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
	const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
	if (exMin) {
		if (legacy) {
			json.minimum = exclusiveMinimum;
			json.exclusiveMinimum = true;
		} else json.exclusiveMinimum = exclusiveMinimum;
	} else if (typeof minimum === "number") json.minimum = minimum;
	if (exMax) {
		if (legacy) {
			json.maximum = exclusiveMaximum;
			json.exclusiveMaximum = true;
		} else json.exclusiveMaximum = exclusiveMaximum;
	} else if (typeof maximum === "number") json.maximum = maximum;
	if (multipleOf) {
		const divisors = /* @__PURE__ */ new Set();
		for (const divisor of multipleOf) if (Number.isFinite(divisor) && divisor !== 0) divisors.add(Math.abs(divisor));
		else handleUnrepresentable(schema, ctx, json, params, `A multipleOf divisor of ${divisor} cannot be represented in JSON Schema`);
		const [first, ...rest] = divisors;
		if (first !== void 0) json.multipleOf = first;
		if (rest.length) json.allOf = [...json.allOf ?? [], ...rest.map((m) => ({ multipleOf: m }))];
	}
};
const booleanProcessor = (_schema, _ctx, json, _params) => {
	json.type = "boolean";
};
const bigintProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "BigInt cannot be represented in JSON Schema");
};
const symbolProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "Symbols cannot be represented in JSON Schema");
};
const nullProcessor = (_schema, ctx, json, _params) => {
	if (ctx.target === "openapi-3.0") {
		json.type = "string";
		json.nullable = true;
		json.enum = [null];
	} else json.type = "null";
};
const undefinedProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "Undefined cannot be represented in JSON Schema");
};
const voidProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "Void cannot be represented in JSON Schema");
};
const neverProcessor = (_schema, _ctx, json, _params) => {
	json.not = {};
};
const anyProcessor = (_schema, _ctx, _json, _params) => {};
const unknownProcessor = (_schema, _ctx, _json, _params) => {};
const dateProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "Date cannot be represented in JSON Schema");
};
const enumProcessor = (schema, _ctx, json, _params) => {
	const def = schema._zod.def;
	const values = getEnumValues(def.entries);
	if (values.length === 0) {
		json.not = {};
		return;
	}
	if (values.every((v) => typeof v === "number")) json.type = "number";
	if (values.every((v) => typeof v === "string")) json.type = "string";
	json.enum = values;
};
const literalProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	if (def.values.length === 0) {
		json.not = {};
		return;
	}
	const vals = [];
	for (const val of def.values) if (val === void 0) {
		if (handleUnrepresentable(schema, ctx, json, params, "Literal `undefined` cannot be represented in JSON Schema")) return;
	} else if (typeof val === "bigint") {
		if (handleUnrepresentable(schema, ctx, json, params, "BigInt literals cannot be represented in JSON Schema")) return;
		vals.push(Number(val));
	} else vals.push(val);
	if (vals.length === 0) {} else if (vals.length === 1) {
		const val = vals[0];
		json.type = val === null ? "null" : typeof val;
		if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
		else json.const = val;
	} else {
		if (vals.every((v) => typeof v === "number")) json.type = "number";
		if (vals.every((v) => typeof v === "string")) json.type = "string";
		if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
		if (vals.every((v) => v === null)) json.type = "null";
		json.enum = vals;
	}
};
const nanProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "NaN cannot be represented in JSON Schema");
};
const templateLiteralProcessor = (schema, _ctx, json, _params) => {
	const _json = json;
	const pattern = schema._zod.pattern;
	if (!pattern) throw new Error("Pattern not found in template literal");
	_json.type = "string";
	_json.pattern = pattern.source;
};
const fileProcessor = (schema, _ctx, json, _params) => {
	const _json = json;
	_json.type = "string";
	_json.format = "binary";
	_json.contentEncoding = "binary";
	const { minimum, maximum, mime } = aggregateChecks(schema);
	if (minimum !== void 0) _json.minLength = minimum;
	if (maximum !== void 0) _json.maxLength = maximum;
	if (!mime) return;
	if (mime.length === 0) _json.not = {};
	else if (mime.length === 1) _json.contentMediaType = mime[0];
	else _json.anyOf = mime.map((m) => ({ contentMediaType: m }));
};
const successProcessor = (_schema, _ctx, json, _params) => {
	json.type = "boolean";
};
const customProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "Custom types cannot be represented in JSON Schema");
};
const functionProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "Function types cannot be represented in JSON Schema");
};
const transformProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "Transforms cannot be represented in JSON Schema");
};
const mapProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "Map cannot be represented in JSON Schema");
};
const setProcessor = (schema, ctx, json, params) => {
	handleUnrepresentable(schema, ctx, json, params, "Set cannot be represented in JSON Schema");
};
const arrayProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	const { minimum, maximum } = aggregateChecks(schema);
	if (typeof minimum === "number") json.minItems = minimum;
	if (typeof maximum === "number") json.maxItems = maximum;
	json.type = "array";
	json.items = processSchema(def.element, ctx, {
		...params,
		path: [...params.path, "items"]
	});
};
function inputOptin(schema) {
	const def = schema._zod.def;
	if (def.type === "pipe" && def.in._zod.traits.has("$ZodTransform")) return inputOptin(def.out);
	if (def.type === "catch") return inputOptin(def.innerType);
	return schema._zod.optin;
}
const objectProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	const shape = def.shape;
	if (Object.getOwnPropertySymbols(shape).length && handleUnrepresentable(schema, ctx, json, params, "Symbol keys cannot be represented in JSON Schema")) return;
	json.type = "object";
	json.properties = {};
	for (const key in shape) assignProp(json.properties, key, processSchema(shape[key], ctx, {
		...params,
		path: [
			...params.path,
			"properties",
			key
		]
	}));
	const requiredKeys = [];
	for (const key of Object.keys(shape)) {
		const field = def.shape[key];
		if (ctx.io === "input" ? inputOptin(field) === void 0 : field._zod.optout === void 0) requiredKeys.push(key);
	}
	if (requiredKeys.length > 0) json.required = requiredKeys;
	if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
	else if (!def.catchall) {
		if (ctx.io === "output") json.additionalProperties = false;
	} else if (def.catchall) json.additionalProperties = processSchema(def.catchall, ctx, {
		...params,
		path: [...params.path, "additionalProperties"]
	});
};
const unionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const isExclusive = def.inclusive === false;
	const options = def.options.map((x, i) => processSchema(x, ctx, {
		...params,
		path: [
			...params.path,
			isExclusive ? "oneOf" : "anyOf",
			i
		]
	}));
	if (isExclusive) json.oneOf = options;
	else json.anyOf = options;
};
const intersectionProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const a = processSchema(def.left, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			0
		]
	});
	const b = processSchema(def.right, ctx, {
		...params,
		path: [
			...params.path,
			"allOf",
			1
		]
	});
	const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
	const allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
	json.allOf = allOf;
	ctx.intersections.push(allOf);
};
const tupleProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	json.type = "array";
	const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
	const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
	const prefixItems = def.items.map((x, i) => processSchema(x, ctx, {
		...params,
		path: [
			...params.path,
			prefixPath,
			i
		]
	}));
	const rest = def.rest ? processSchema(def.rest, ctx, {
		...params,
		path: [
			...params.path,
			restPath,
			...ctx.target === "openapi-3.0" ? [def.items.length] : []
		]
	}) : null;
	let minItems = def.items.length;
	while (minItems > 0) {
		const item = def.items[minItems - 1];
		if (!(ctx.io === "input" ? inputOptin(item) !== void 0 : item._zod.optout === "optional")) break;
		minItems--;
	}
	const maxItems = def.items.length;
	const isClosed = !def.rest;
	if (ctx.target === "draft-2020-12") {
		json.prefixItems = prefixItems;
		if (isClosed) json.items = false;
		else if (rest) json.items = rest;
		if (minItems > 0) json.minItems = minItems;
		if (isClosed) json.maxItems = maxItems;
	} else if (ctx.target === "openapi-3.0") {
		json.items = { anyOf: prefixItems };
		if (rest) json.items.anyOf.push(rest);
		if (minItems > 0) json.minItems = minItems;
		if (isClosed) json.maxItems = maxItems;
	} else {
		json.items = prefixItems;
		if (isClosed) json.additionalItems = false;
		else if (rest) json.additionalItems = rest;
		if (minItems > 0) json.minItems = minItems;
		if (isClosed) json.maxItems = maxItems;
	}
	const { minimum, maximum } = aggregateChecks(schema);
	if (typeof minimum === "number") json.minItems = minimum;
	if (typeof maximum === "number") json.maxItems = maximum;
};
/** JSON object keys are always strings, so a numeric record key schema is re-expressed over the
* numeric-string form the record parser matches. Deferred to `finalize`, after the flatten: a key
* behind a wrapper only carries its own `type` before then, and a union key only has its branches.
*
* A numeric bound cannot apply to a property name, so `minimum` and its siblings are dropped rather
* than carried over: keeping them beside `type: "string"` reproduces the match-nothing schema this
* exists to fix. A key that carries one therefore emits wider than the record parses — `z.record(z.number().min(5), V)`
* accepts `"3"` — which is the deliberate trade, since throwing on it would reject an ordinary schema
* outright. */
function stringifyKeyNames(bySchema, json, visited) {
	if (json.$ref) {
		if (visited.has(json)) return json;
		visited.add(json);
		const def = bySchema.get(json)?.def;
		if (!def) return json;
		const inlined = stringifyKeyNames(bySchema, def, visited);
		return inlined === def ? json : inlined;
	}
	for (const keyword of ["anyOf", "oneOf"]) {
		const branches = json[keyword];
		if (!Array.isArray(branches)) continue;
		const mapped = branches.map((branch) => stringifyKeyNames(bySchema, branch, visited));
		if (mapped.some((branch, i) => branch !== branches[i])) json = {
			...json,
			[keyword]: mapped
		};
	}
	const types = Array.isArray(json.type) ? json.type : [json.type];
	const numericType = !types.includes("string") && types.some((t) => t === "number" || t === "integer");
	const values = json.enum ?? (json.const !== void 0 ? [json.const] : void 0);
	if (!numericType && !values?.some((v) => typeof v === "number")) return json;
	const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf, format, id, ...rest } = json;
	if (rest.enum) rest.enum = rest.enum.map((v) => typeof v === "number" ? String(v) : v);
	else if (typeof rest.const === "number") rest.const = String(rest.const);
	if (!numericType) return rest;
	rest.type = "string";
	if (!values) rest.pattern = (types.includes("number") ? number$2 : integer).source;
	return rest;
}
/** Every record of one conversion, so the carriers are found in a single pass rather than once per record. */
const pendingRecords = /* @__PURE__ */ new WeakMap();
function rewriteKeyNames(ctx) {
	const bySchema = /* @__PURE__ */ new Map();
	for (const entry of ctx.seen.values()) if (entry.def && !bySchema.has(entry.schema)) bySchema.set(entry.schema, entry);
	const rewrites = /* @__PURE__ */ new Map();
	for (const record of pendingRecords.get(ctx) ?? []) {
		const seen = ctx.seen.get(record);
		const names = (seen?.def ?? seen?.schema)?.propertyNames;
		if (!names || names === true || rewrites.has(names)) continue;
		const rewritten = stringifyKeyNames(bySchema, names, /* @__PURE__ */ new Set());
		if (rewritten !== names) rewrites.set(names, rewritten);
	}
	if (!rewrites.size) return;
	for (const entry of ctx.seen.values()) for (const carrier of [entry.schema, entry.def]) {
		const rewritten = carrier && rewrites.get(carrier.propertyNames);
		if (rewritten) carrier.propertyNames = rewritten;
	}
}
const recordProcessor = (schema, ctx, _json, params) => {
	const json = _json;
	const def = schema._zod.def;
	json.type = "object";
	const keyType = def.keyType;
	const patterns = aggregateChecks(keyType).patterns;
	if (def.mode === "loose" && patterns && patterns.size > 0) {
		const valueSchema = processSchema(def.valueType, ctx, {
			...params,
			path: [
				...params.path,
				"patternProperties",
				"*"
			]
		});
		json.patternProperties = {};
		for (const pattern of patterns) assignProp(json.patternProperties, exactPattern(pattern).source, valueSchema);
	} else {
		if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
			json.propertyNames = processSchema(def.keyType, ctx, {
				...params,
				path: [...params.path, "propertyNames"]
			});
			let pending = pendingRecords.get(ctx);
			if (!pending) {
				pending = [];
				pendingRecords.set(ctx, pending);
				ctx.deferred.push(() => rewriteKeyNames(ctx));
			}
			pending.push(schema);
		}
		json.additionalProperties = processSchema(def.valueType, ctx, {
			...params,
			path: [...params.path, "additionalProperties"]
		});
	}
	const keyValues = keyType._zod.values;
	const omittableOnInput = ctx.io === "input" && inputOptin(def.valueType) !== void 0;
	if (keyValues && !def.partial && !omittableOnInput) {
		const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
		if (validKeyValues.length > 0) json.required = validKeyValues.map(String);
	}
};
const nullableProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	const inner = processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	if (ctx.target === "openapi-3.0") {
		seen.ref = def.innerType;
		json.nullable = true;
	} else json.anyOf = [inner, { type: "null" }];
};
const nonoptionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
/** Round-trips a default value through JSON so the emitted schema is guaranteed to be valid JSON.
* A BigInt has no reliable encoding, so it goes through `unrepresentable` like any other
* unrepresentable value. Returns a sentinel when the caller must not write a default of its own. */
const UNREPRESENTABLE_DEFAULT = Symbol();
function serializeDefaultValue(value, schema, ctx, json, params) {
	let unrepresentable = false;
	const serialized = JSON.stringify(value, (_, val) => {
		if (typeof val !== "bigint") return val;
		unrepresentable = true;
		return null;
	});
	if (!unrepresentable) return JSON.parse(serialized);
	handleUnrepresentable(schema, ctx, json, params, "BigInt defaults cannot be represented in JSON Schema");
	return UNREPRESENTABLE_DEFAULT;
}
const defaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
	if (value !== UNREPRESENTABLE_DEFAULT) json.default = value;
};
const prefaultProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	if (ctx.io !== "input") return;
	const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
	if (value !== UNREPRESENTABLE_DEFAULT) json._prefault = value;
};
const catchProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	let catchValue;
	try {
		catchValue = def.catchValue(void 0);
	} catch {
		handleUnrepresentable(schema, ctx, json, params, "Dynamic catch values are not supported in JSON Schema");
		return;
	}
	json.default = catchValue;
};
const pipeProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	const inIsTransform = def.in._zod.traits.has("$ZodTransform");
	const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
	processSchema(innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = innerType;
};
const readonlyProcessor = (schema, ctx, json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
	json.readOnly = true;
};
const promiseProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
const optionalProcessor = (schema, ctx, _json, params) => {
	const def = schema._zod.def;
	processSchema(def.innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = def.innerType;
};
const lazyProcessor = (schema, ctx, _json, params) => {
	const innerType = schema._zod.innerType;
	processSchema(innerType, ctx, params);
	const seen = ctx.seen.get(schema);
	seen.ref = innerType;
};
const allProcessors = {
	string: stringProcessor,
	number: numberProcessor,
	boolean: booleanProcessor,
	bigint: bigintProcessor,
	symbol: symbolProcessor,
	null: nullProcessor,
	undefined: undefinedProcessor,
	void: voidProcessor,
	never: neverProcessor,
	any: anyProcessor,
	unknown: unknownProcessor,
	date: dateProcessor,
	enum: enumProcessor,
	literal: literalProcessor,
	nan: nanProcessor,
	template_literal: templateLiteralProcessor,
	file: fileProcessor,
	success: successProcessor,
	custom: customProcessor,
	function: functionProcessor,
	transform: transformProcessor,
	map: mapProcessor,
	set: setProcessor,
	array: arrayProcessor,
	object: objectProcessor,
	union: unionProcessor,
	intersection: intersectionProcessor,
	tuple: tupleProcessor,
	record: recordProcessor,
	nullable: nullableProcessor,
	nonoptional: nonoptionalProcessor,
	default: defaultProcessor,
	prefault: prefaultProcessor,
	catch: catchProcessor,
	pipe: pipeProcessor,
	readonly: readonlyProcessor,
	promise: promiseProcessor,
	optional: optionalProcessor,
	lazy: lazyProcessor
};
function toJSONSchema(input, params) {
	if ("_idmap" in input) {
		const registry = input;
		const ctx = initializeContext({
			...params,
			processors: allProcessors
		});
		const defs = {};
		for (const entry of registry._idmap.entries()) {
			const [_, schema] = entry;
			processSchema(schema, ctx);
		}
		const schemas = {};
		ctx.external = {
			registry,
			uri: params?.uri,
			defs
		};
		for (const entry of registry._idmap.entries()) {
			const [key, schema] = entry;
			extractDefs(ctx, schema);
			assignProp(schemas, key, finalize(ctx, schema));
		}
		if (Object.keys(defs).length > 0) schemas.__shared = { [ctx.target === "draft-2020-12" ? "$defs" : "definitions"]: defs };
		return { schemas };
	}
	const ctx = initializeContext({
		...params,
		processors: allProcessors
	});
	processSchema(input, ctx);
	extractDefs(ctx, input);
	return finalize(ctx, input);
}
//#endregion
//#region node_modules/zod/v4/classic/errors.js
const _installedErrorProtos = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
function _lazyMethod(proto, key, make) {
	Object.defineProperty(proto, key, {
		configurable: true,
		enumerable: false,
		get() {
			const value = make(this);
			Object.defineProperty(this, key, {
				value,
				configurable: true,
				writable: true
			});
			return value;
		},
		set(value) {
			Object.defineProperty(this, key, {
				value,
				configurable: true,
				writable: true
			});
		}
	});
}
const initializer = (inst, issues) => {
	$ZodError.init(inst, issues);
	inst.name = "ZodError";
	const proto = Object.getPrototypeOf(inst);
	if (_installedErrorProtos.has(proto)) return;
	_installedErrorProtos.add(proto);
	_lazyMethod(proto, "format", (self) => (mapper) => formatError(self, mapper));
	_lazyMethod(proto, "flatten", (self) => (mapper) => flattenError(self, mapper));
	_lazyMethod(proto, "addIssue", (self) => (issue) => {
		self.issues.push(issue);
		self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
	});
	_lazyMethod(proto, "addIssues", (self) => (issues) => {
		self.issues.push(...issues);
		self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
	});
	Object.defineProperty(proto, "isEmpty", {
		configurable: true,
		enumerable: false,
		get() {
			return this.issues.length === 0;
		}
	});
};
const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, void 0, { Parent: Error });
//#endregion
//#region node_modules/zod/v4/classic/parse.js
const parse = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
const encode = /* @__PURE__ */ _encode(ZodRealError);
const decode = /* @__PURE__ */ _decode(ZodRealError);
const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
//#endregion
//#region node_modules/zod/v4/classic/schemas.js
function _ensureDefaultLocale() {
	if (!globalConfig.localeError) config(en_default());
}
function _ensureDefaultMemoizer() {
	if (!globalConfig.memoizer) config({ memoizer: memoizer() });
}
const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
	_ensureDefaultLocale();
	$ZodType.init(inst, def);
	inst.def = def;
	inst.type = def.type;
	return inst;
}, {
	check(...chks) {
		const def = this.def;
		return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
			check: ch,
			def: { check: "custom" },
			onattach: []
		} } : ch)] }), { parent: true });
	},
	with(...chks) {
		return this.check(...chks);
	},
	clone(def, params) {
		return clone(this, def, params);
	},
	brand() {
		return this;
	},
	register(reg, meta) {
		reg.add(this, meta);
		return this;
	},
	refine(check, params) {
		return this.check(refine(check, params));
	},
	superRefine(refinement, params) {
		return this.check(superRefine(refinement, params));
	},
	overwrite(fn) {
		return this.check(/* @__PURE__ */ _overwrite(fn));
	},
	optional() {
		return optional(this);
	},
	exactOptional() {
		return exactOptional(this);
	},
	nullable() {
		return nullable(this);
	},
	nullish() {
		return optional(nullable(this));
	},
	nonoptional(params) {
		return nonoptional(this, params);
	},
	array() {
		return array(this);
	},
	or(arg) {
		return union([this, arg]);
	},
	and(arg) {
		return intersection(this, arg);
	},
	transform(tx) {
		return pipe(this, transform(tx));
	},
	default(d) {
		return _default(this, d);
	},
	prefault(d) {
		return prefault(this, d);
	},
	catch(params) {
		return _catch(this, params);
	},
	pipe(target) {
		return pipe(this, target);
	},
	readonly() {
		return readonly(this);
	},
	describe(description) {
		const cl = this.clone();
		globalRegistry.add(cl, { description });
		return cl;
	},
	meta(...args) {
		if (args.length === 0) return globalRegistry.get(this);
		const cl = this.clone();
		globalRegistry.add(cl, args[0]);
		return cl;
	},
	isOptional() {
		return this.safeParse(void 0).success;
	},
	isNullable() {
		return this.safeParse(null).success;
	},
	apply(fn, ...args) {
		return args.length === 0 ? fn(this) : fn(this, ...args);
	},
	get "~standard"() {
		return hide(this, "~standard", {
			...standardProps(this),
			jsonSchema: {
				input: createStandardJSONSchemaMethod(this, "input"),
				output: createStandardJSONSchemaMethod(this, "output")
			}
		});
	},
	set "~standard"(value) {
		own(this, "~standard", value);
	},
	parse: function _parse(data, params) {
		return parse(this, data, params, { callee: _parse });
	},
	parseAsync: async function _parseAsync(data, params) {
		return await parseAsync(this, data, params, { callee: _parseAsync });
	},
	safeParse(data, params) {
		return safeParse(this, data, params);
	},
	async safeParseAsync(data, params) {
		return safeParseAsync(this, data, params);
	},
	get spa() {
		return this?.safeParseAsync;
	},
	set spa(value) {
		own(this, "spa", value);
	},
	validate(data, params) {
		return validate$1(this, data, params);
	},
	validateAsync(data, params) {
		return validateAsync$1(this, data, params);
	},
	encode: function _encode(data, params) {
		return encode(this, data, params, { callee: _encode });
	},
	decode: function _decode(data, params) {
		return decode(this, data, params, { callee: _decode });
	},
	encodeAsync: async function _encodeAsync(data, params) {
		return await encodeAsync(this, data, params, { callee: _encodeAsync });
	},
	decodeAsync: async function _decodeAsync(data, params) {
		return await decodeAsync(this, data, params, { callee: _decodeAsync });
	},
	safeEncode(data, params) {
		return safeEncode(this, data, params);
	},
	safeDecode(data, params) {
		return safeDecode(this, data, params);
	},
	async safeEncodeAsync(data, params) {
		return safeEncodeAsync(this, data, params);
	},
	async safeDecodeAsync(data, params) {
		return safeDecodeAsync(this, data, params);
	},
	toJSONSchema(params) {
		return createToJSONSchemaMethod(this, {})(params);
	},
	get description() {
		return globalRegistry.get(this)?.description;
	},
	get _def() {
		return this._zod.def;
	}
});
/** @internal */
const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
}, /*@__PURE__*/ derived({
	format: (inst) => aggregateChecks(inst).format ?? null,
	minLength: (inst) => aggregateChecks(inst).minimum ?? null,
	maxLength: (inst) => aggregateChecks(inst).maximum ?? null
}, {
	regex(...args) {
		return this.check(/* @__PURE__ */ _regex(...args));
	},
	includes(...args) {
		return this.check(/* @__PURE__ */ _includes(...args));
	},
	startsWith(...args) {
		return this.check(/* @__PURE__ */ _startsWith(...args));
	},
	endsWith(...args) {
		return this.check(/* @__PURE__ */ _endsWith(...args));
	},
	min(...args) {
		return this.check(/* @__PURE__ */ _minLength(...args));
	},
	max(...args) {
		return this.check(/* @__PURE__ */ _maxLength(...args));
	},
	length(...args) {
		return this.check(/* @__PURE__ */ _length(...args));
	},
	nonempty(...args) {
		return this.check(/* @__PURE__ */ _minLength(1, ...args));
	},
	lowercase(params) {
		return this.check(/* @__PURE__ */ _lowercase(params));
	},
	uppercase(params) {
		return this.check(/* @__PURE__ */ _uppercase(params));
	},
	trim() {
		return this.check(/* @__PURE__ */ _trim());
	},
	normalize(...args) {
		return this.check(/* @__PURE__ */ _normalize(...args));
	},
	toLowerCase() {
		return this.check(/* @__PURE__ */ _toLowerCase());
	},
	toUpperCase() {
		return this.check(/* @__PURE__ */ _toUpperCase());
	},
	slugify() {
		return this.check(/* @__PURE__ */ _slugify());
	}
}));
const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	_ZodString.init(inst, def);
}, {
	email(params) {
		return this.check(/* @__PURE__ */ _email(ZodEmail, params));
	},
	url(params) {
		return this.check(/* @__PURE__ */ _url(ZodURL, params));
	},
	jwt(params) {
		return this.check(/* @__PURE__ */ _jwt(ZodJWT, params));
	},
	emoji(params) {
		return this.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
	},
	guid(params) {
		return this.check(/* @__PURE__ */ _guid(ZodGUID, params));
	},
	uuid(params) {
		return this.check(/* @__PURE__ */ _uuid(ZodUUID, params));
	},
	uuidv4(params) {
		return this.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
	},
	uuidv6(params) {
		return this.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
	},
	uuidv7(params) {
		return this.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
	},
	nanoid(params) {
		return this.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
	},
	cuid(params) {
		return this.check(/* @__PURE__ */ _cuid(ZodCUID, params));
	},
	cuid2(params) {
		return this.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
	},
	ulid(params) {
		return this.check(/* @__PURE__ */ _ulid(ZodULID, params));
	},
	base64(params) {
		return this.check(/* @__PURE__ */ _base64(ZodBase64, params));
	},
	base64url(params) {
		return this.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
	},
	xid(params) {
		return this.check(/* @__PURE__ */ _xid(ZodXID, params));
	},
	ksuid(params) {
		return this.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
	},
	ipv4(params) {
		return this.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
	},
	ipv6(params) {
		return this.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
	},
	cidrv4(params) {
		return this.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
	},
	cidrv6(params) {
		return this.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
	},
	e164(params) {
		return this.check(/* @__PURE__ */ _e164(ZodE164, params));
	},
	datetime(params) {
		return this.check(/* @__PURE__ */ _isoDateTime(ZodISODateTime, params));
	},
	date(params) {
		return this.check(/* @__PURE__ */ _isoDate(ZodISODate, params));
	},
	time(params) {
		return this.check(/* @__PURE__ */ _isoTime(ZodISOTime, params));
	},
	duration(params) {
		return this.check(/* @__PURE__ */ _isoDuration(ZodISODuration, params));
	}
});
function string(params) {
	return /* @__PURE__ */ _string(ZodString, params);
}
const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	_ZodString.init(inst, def);
});
const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
	$ZodISODateTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
	$ZodISODate.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
	$ZodISOTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
	$ZodISODuration.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
	$ZodEmail.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function email(params) {
	return /* @__PURE__ */ _email(ZodEmail, params);
}
const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
	$ZodGUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
	$ZodUUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
	$ZodURL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function url(params) {
	return /* @__PURE__ */ _url(ZodURL, params);
}
const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
	$ZodEmoji.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
	$ZodNanoID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
/**
* @deprecated CUID v1 is deprecated by its authors due to information leakage
* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
* See https://github.com/paralleldrive/cuid.
*/
const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
	$ZodCUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
	$ZodCUID2.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
	$ZodULID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
	$ZodXID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
	$ZodKSUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
	$ZodIPv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
	$ZodIPv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
	$ZodCIDRv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
	$ZodCIDRv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
	$ZodBase64.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
	$ZodBase64URL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
	$ZodE164.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
	$ZodJWT.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
	$ZodNumber.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
	inst.isFinite = true;
}, /*@__PURE__*/ derived({
	minValue: (inst) => {
		const { minimum, exclusiveMinimum } = aggregateChecks(inst);
		return Math.max(minimum ?? Number.NEGATIVE_INFINITY, exclusiveMinimum ?? Number.NEGATIVE_INFINITY);
	},
	maxValue: (inst) => {
		const { maximum, exclusiveMaximum } = aggregateChecks(inst);
		return Math.min(maximum ?? Number.POSITIVE_INFINITY, exclusiveMaximum ?? Number.POSITIVE_INFINITY);
	},
	isInt: (inst) => {
		const { isInt, multipleOf } = aggregateChecks(inst);
		return !!isInt || !!multipleOf?.some(Number.isSafeInteger);
	},
	format: (inst) => aggregateChecks(inst).format ?? null
}, {
	gt(value, params) {
		return this.check(/* @__PURE__ */ _gt(value, params));
	},
	gte(value, params) {
		return this.check(/* @__PURE__ */ _gte(value, params));
	},
	min(value, params) {
		return this.check(/* @__PURE__ */ _gte(value, params));
	},
	lt(value, params) {
		return this.check(/* @__PURE__ */ _lt(value, params));
	},
	lte(value, params) {
		return this.check(/* @__PURE__ */ _lte(value, params));
	},
	max(value, params) {
		return this.check(/* @__PURE__ */ _lte(value, params));
	},
	int(params) {
		return this.check(int(params));
	},
	safe(params) {
		return this.check(int(params));
	},
	positive(params) {
		return this.check(/* @__PURE__ */ _gt(0, params));
	},
	nonnegative(params) {
		return this.check(/* @__PURE__ */ _gte(0, params));
	},
	negative(params) {
		return this.check(/* @__PURE__ */ _lt(0, params));
	},
	nonpositive(params) {
		return this.check(/* @__PURE__ */ _lte(0, params));
	},
	multipleOf(value, params) {
		return this.check(/* @__PURE__ */ _multipleOf(value, params));
	},
	step(value, params) {
		return this.check(/* @__PURE__ */ _multipleOf(value, params));
	},
	finite() {
		return this;
	}
}));
function number$1(params) {
	return /* @__PURE__ */ _number(ZodNumber, params);
}
const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
	$ZodNumberFormat.init(inst, def);
	ZodNumber.init(inst, def);
});
function int(params) {
	return /* @__PURE__ */ _int(ZodNumberFormat, params);
}
const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
	$ZodBoolean.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
});
function boolean(params) {
	return /* @__PURE__ */ _boolean(ZodBoolean, params);
}
const ZodNull = /*@__PURE__*/ $constructor("ZodNull", (inst, def) => {
	$ZodNull.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
});
function _null(params) {
	return /* @__PURE__ */ _null$1(ZodNull, params);
}
const ZodAny = /*@__PURE__*/ $constructor("ZodAny", (inst, def) => {
	$ZodAny.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => void 0;
});
function any() {
	return /* @__PURE__ */ _any(ZodAny);
}
const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
	$ZodUnknown.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => void 0;
});
function unknown() {
	return /* @__PURE__ */ _unknown(ZodUnknown);
}
const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
	$ZodNever.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
function never(params) {
	return /* @__PURE__ */ _never(ZodNever, params);
}
const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
	_ensureDefaultMemoizer();
	$ZodArray.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
	inst.element = def.element;
}, {
	min(n, params) {
		return this.check(/* @__PURE__ */ _minLength(n, params));
	},
	nonempty(params) {
		return this.check(/* @__PURE__ */ _minLength(1, params));
	},
	max(n, params) {
		return this.check(/* @__PURE__ */ _maxLength(n, params));
	},
	length(n, params) {
		return this.check(/* @__PURE__ */ _length(n, params));
	},
	unwrap() {
		return this.element;
	}
});
function array(element, params) {
	return /* @__PURE__ */ _array(ZodArray, element, params);
}
const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
	_ensureDefaultMemoizer();
	$ZodObjectJIT.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
	installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
}, {
	keyof() {
		return _enum(Object.keys(this._zod.def.shape));
	},
	catchall(catchall) {
		return this.clone(mergeDefs(this._zod.def, { catchall }));
	},
	passthrough() {
		return this.clone(mergeDefs(this._zod.def, { catchall: unknown() }));
	},
	loose() {
		return this.clone(mergeDefs(this._zod.def, { catchall: unknown() }));
	},
	strict() {
		return this.clone(mergeDefs(this._zod.def, { catchall: never() }));
	},
	strip() {
		return this.clone(mergeDefs(this._zod.def, { catchall: void 0 }));
	},
	extend(incoming) {
		return extend(this, incoming);
	},
	safeExtend(incoming) {
		return safeExtend(this, incoming);
	},
	merge(other) {
		return merge(this, other);
	},
	pick(mask) {
		return pick(this, mask);
	},
	omit(mask) {
		return omit(this, mask);
	},
	partial(...args) {
		return partial(ZodOptional, this, args[0]);
	},
	exactPartial(...args) {
		return partial(ZodExactOptional, this, args[0], "exactPartial");
	},
	required(...args) {
		return required(ZodNonOptional, this, args[0]);
	}
});
function object(shape, params) {
	const def = {
		type: "object",
		shape: shape ?? {},
		...normalizeParams(params)
	};
	return new ZodObject(def);
}
function looseObject(shape, params) {
	return new ZodObject({
		type: "object",
		shape,
		catchall: unknown(),
		...normalizeParams(params)
	});
}
const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
	$ZodUnion.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
	inst.options = def.options;
});
function union(options, params) {
	return new ZodUnion({
		type: "union",
		options,
		...normalizeParams(params)
	});
}
const ZodDiscriminatedUnion = /*@__PURE__*/ $constructor("ZodDiscriminatedUnion", (inst, def) => {
	ZodUnion.init(inst, def);
	$ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
	return new ZodDiscriminatedUnion({
		type: "union",
		options,
		discriminator,
		...normalizeParams(params)
	});
}
const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
	$ZodIntersection.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
	return new ZodIntersection({
		type: "intersection",
		left,
		right
	});
}
const ZodRecord = /*@__PURE__*/ $constructor("ZodRecord", (inst, def) => {
	_ensureDefaultMemoizer();
	$ZodRecord.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
	inst.keyType = def.keyType;
	inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
	if (!valueType || !valueType._zod) return new ZodRecord({
		type: "record",
		keyType: string(),
		valueType: keyType,
		...normalizeParams(valueType)
	});
	return new ZodRecord({
		type: "record",
		keyType,
		valueType,
		...normalizeParams(params)
	});
}
const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
	$ZodEnum.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
	inst.enum = def.entries;
	inst.options = [...inst._zod.values];
	const keys = new Set(Object.keys(def.entries));
	inst.extract = (values, params) => {
		const newEntries = {};
		for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
	inst.exclude = (values, params) => {
		const newEntries = { ...def.entries };
		for (const value of values) if (keys.has(value)) delete newEntries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
});
function _enum(values, params) {
	const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
	return new ZodEnum({
		type: "enum",
		entries,
		...normalizeParams(params)
	});
}
const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
	$ZodLiteral.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
	inst.values = new Set(def.values);
	Object.defineProperty(inst, "value", { get() {
		if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
		return def.values[0];
	} });
});
function literal(value, params) {
	return new ZodLiteral({
		type: "literal",
		values: Array.isArray(value) ? value : [value],
		...normalizeParams(params)
	});
}
const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
	_ensureDefaultMemoizer();
	$ZodTransform.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
	inst._zod.parse = (payload, _ctx) => {
		if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
		payload.addIssue = (issue$1) => {
			if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
			else {
				const _issue = issue$1;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				if (!("input" in _issue)) _issue.input = payload.value;
				_issue.inst ?? (_issue.inst = inst);
				payload.issues.push(issue(_issue));
			}
		};
		const output = def.transform(payload.value, payload);
		if (output instanceof Promise) return output.then((output) => {
			payload.value = output;
			return payload;
		});
		payload.value = output;
		return payload;
	};
});
function transform(fn) {
	return new ZodTransform({
		type: "transform",
		transform: fn
	});
}
const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
	return new ZodOptional({
		type: "optional",
		innerType
	});
}
const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
	$ZodExactOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
	return new ZodExactOptional({
		type: "optional",
		innerType
	});
}
const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
	$ZodNullable.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
	return new ZodNullable({
		type: "nullable",
		innerType
	});
}
const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
	$ZodDefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
	return new ZodDefault({
		type: "default",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
	$ZodPrefault.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
	return new ZodPrefault({
		type: "prefault",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
		}
	});
}
const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
	$ZodNonOptional.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
	return new ZodNonOptional({
		type: "nonoptional",
		innerType,
		...normalizeParams(params)
	});
}
const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
	$ZodCatch.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
	return new ZodCatch({
		type: "catch",
		innerType,
		catchValue: typeof catchValue === "function" ? catchValue : constantCatch(catchValue)
	});
}
const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
	$ZodPipe.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
	inst.in = def.in;
	inst.out = def.out;
});
function pipe(in_, out) {
	return new ZodPipe({
		type: "pipe",
		in: in_,
		out
	});
}
const ZodPreprocess = /*@__PURE__*/ $constructor("ZodPreprocess", (inst, def) => {
	ZodPipe.init(inst, def);
	$ZodPreprocess.init(inst, def);
});
const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
	$ZodReadonly.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
	return new ZodReadonly({
		type: "readonly",
		innerType
	});
}
const ZodLazy = /*@__PURE__*/ $constructor("ZodLazy", (inst, def) => {
	$ZodLazy.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => lazyProcessor(inst, ctx, json, params);
	inst.unwrap = () => inst._zod.def.getter();
});
function lazy(getter) {
	return new ZodLazy({
		type: "lazy",
		getter
	});
}
const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
	$ZodCustom.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
function refine(fn, _params = {}) {
	return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
	return /* @__PURE__ */ _superRefine(fn, params);
}
function preprocess(fn, schema) {
	return new ZodPreprocess({
		type: "pipe",
		in: transform(fn),
		out: schema
	});
}
//#endregion
//#region node_modules/zod/v4/classic/compat.js
/** @deprecated Use the raw string literal codes instead, e.g. "invalid_type". */
const ZodIssueCode = {
	invalid_type: "invalid_type",
	too_big: "too_big",
	too_small: "too_small",
	invalid_format: "invalid_format",
	not_multiple_of: "not_multiple_of",
	unrecognized_keys: "unrecognized_keys",
	invalid_union: "invalid_union",
	invalid_key: "invalid_key",
	invalid_element: "invalid_element",
	invalid_value: "invalid_value",
	custom: "custom"
};
/** @deprecated Do not use. Stub definition, only included for zod-to-json-schema compatibility. */
var ZodFirstPartyTypeKind;
ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {});
//#endregion
//#region node_modules/zod/v4/classic/iso.js
function datetime(params) {
	return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
}
function date$1(params) {
	return /* @__PURE__ */ _isoDate(ZodISODate, params);
}
//#endregion
//#region node_modules/zod/v4/classic/coerce.js
function number(params) {
	return /* @__PURE__ */ _coercedNumber(ZodNumber, params);
}
const SUPPORTED_PROTOCOL_VERSIONS = [
	"2025-11-25",
	"2025-06-18",
	"2025-03-26",
	"2024-11-05",
	"2024-10-07"
];
/**
* `_meta` key associating a message with a 2025-11-25 task.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
/**
* `_meta` key carrying the MCP protocol version governing a request.
*
* For the HTTP transport, the value must match the `MCP-Protocol-Version` header.
*/
const PROTOCOL_VERSION_META_KEY = "io.modelcontextprotocol/protocolVersion";
/**
* `_meta` key identifying the client software making a request.
*
* Clients SHOULD include it on every request; the value is self-reported and
* intended for display, logging, and debugging — servers should not rely on
* it for behavior or security decisions.
*/
const CLIENT_INFO_META_KEY = "io.modelcontextprotocol/clientInfo";
/**
* `_meta` key identifying the server software producing a response.
*
* Servers SHOULD include it on every response; the value is self-reported and
* intended for display, logging, and debugging — clients should not rely on
* it for behavior or security decisions.
*/
const SERVER_INFO_META_KEY = "io.modelcontextprotocol/serverInfo";
/**
* `_meta` key carrying the client's capabilities for a request.
*
* Capabilities are declared per request rather than once at initialization;
* servers must not infer capabilities from prior requests.
*/
const CLIENT_CAPABILITIES_META_KEY = "io.modelcontextprotocol/clientCapabilities";
/**
* `_meta` key carrying the JSON-RPC ID of the `subscriptions/listen` request
* that opened the stream a notification was delivered on.
*
* Stamped by the server on every notification delivered via a
* `subscriptions/listen` stream (including the leading
* `notifications/subscriptions/acknowledged`); on stdio, where all messages
* share one channel, clients use it to correlate notifications with their
* originating subscription. The value is the listen request's JSON-RPC ID
* verbatim.
*/
const SUBSCRIPTION_ID_META_KEY = "io.modelcontextprotocol/subscriptionId";
/**
* `_meta` key carrying the desired log level for a request.
*
* When absent, the server must not send `notifications/message` notifications
* for the request.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months.
*/
const LOG_LEVEL_META_KEY = "io.modelcontextprotocol/logLevel";
const JSONValueSchema = lazy(() => union([
	string(),
	number$1(),
	boolean(),
	_null(),
	record(string(), JSONValueSchema),
	array(JSONValueSchema)
]));
const JSONObjectSchema = record(string(), JSONValueSchema);
const JSONArraySchema = array(JSONValueSchema);
/**
* A progress token, used to associate progress notifications with the original request.
*/
const ProgressTokenSchema = union([string(), number$1().int()]);
/**
* An opaque token used to represent a cursor for pagination.
*/
const CursorSchema = string();
/** @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only. */
const TaskMetadataSchema = object({ ttl: number$1().optional() });
/**
* Metadata for associating messages with a task.
* Include this in the `_meta` field under the key `io.modelcontextprotocol/related-task`.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const RelatedTaskMetadataSchema = object({ taskId: string() });
const RequestMetaSchema = looseObject({
	progressToken: ProgressTokenSchema.optional(),
	[RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
});
/**
* Common params for any request.
*/
const BaseRequestParamsSchema = object({ _meta: RequestMetaSchema.optional() });
/**
* Common params for any task-augmented request.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({ task: TaskMetadataSchema.optional() });
const RequestSchema = object({
	method: string(),
	params: BaseRequestParamsSchema.loose().optional()
});
const NotificationsParamsSchema = object({ _meta: RequestMetaSchema.optional() });
const NotificationSchema = object({
	method: string(),
	params: NotificationsParamsSchema.loose().optional()
});
/**
* The contents of a result's `_meta` field (the 2026-07-28 `ResultMetaObject`).
* Loose — implementation-specific keys pass through.
*
* The serverInfo key identifies the server software producing the response
* (servers SHOULD include it on every response; the value is self-reported
* and intended for display, logging, and debugging). The getter defers the
* `ImplementationSchema` reference, which is declared later in this file.
*/
const ResultMetaObjectSchema = looseObject({ get [SERVER_INFO_META_KEY]() {
	return ImplementationSchema.optional().catch(void 0);
} });
const ResultSchema = looseObject({ _meta: ResultMetaObjectSchema.optional() });
/**
* A uniquely identifying ID for a request in JSON-RPC.
*/
const RequestIdSchema = union([string(), number$1().int()]);
/**
* A request that expects a response.
*/
const JSONRPCRequestSchema = object({
	jsonrpc: literal("2.0"),
	id: RequestIdSchema,
	...RequestSchema.shape
}).strict();
/**
* A notification which does not expect a response.
*/
const JSONRPCNotificationSchema = object({
	jsonrpc: literal("2.0"),
	...NotificationSchema.shape
}).strict();
/**
* A successful (non-error) response to a request.
*/
const JSONRPCResultResponseSchema = object({
	jsonrpc: literal("2.0"),
	id: RequestIdSchema,
	result: ResultSchema
}).strict();
/**
* A response to a request that indicates an error occurred.
*/
const JSONRPCErrorResponseSchema = object({
	jsonrpc: literal("2.0"),
	id: RequestIdSchema.optional(),
	error: object({
		code: number$1().int(),
		message: string(),
		data: unknown().optional()
	})
}).strict();
const JSONRPCMessageSchema = union([
	JSONRPCRequestSchema,
	JSONRPCNotificationSchema,
	JSONRPCResultResponseSchema,
	JSONRPCErrorResponseSchema
]);
const JSONRPCResponseSchema = union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
/**
* A response that indicates success but carries no data.
*/
const EmptyResultSchema = ResultSchema.strict();
const CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
	requestId: RequestIdSchema.optional(),
	reason: string().optional()
});
/**
* This notification can be sent by either side to indicate that it is cancelling a previously-issued request.
*
* The request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.
*
* This notification indicates that the result will be unused, so any associated processing SHOULD cease.
*
* A client MUST NOT attempt to cancel its {@linkcode InitializeRequest | initialize} request.
*/
const CancelledNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/cancelled"),
	params: CancelledNotificationParamsSchema
});
/**
* Icon schema for use in {@link Tool | tools}, {@link Prompt | prompts}, {@link Resource | resources}, and {@link Implementation | implementations}.
*/
const IconSchema = object({
	src: string(),
	mimeType: string().optional(),
	sizes: array(string()).optional(),
	theme: _enum(["light", "dark"]).optional()
});
/**
* Base schema to add `icons` property.
*
*/
const IconsSchema = object({ icons: array(IconSchema).optional() });
/**
* Base metadata interface for common properties across {@link Resource | resources}, {@link Tool | tools}, {@link Prompt | prompts}, and {@link Implementation | implementations}.
*/
const BaseMetadataSchema = object({
	name: string(),
	title: string().optional()
});
/**
* Describes the name and version of an MCP implementation.
*/
const ImplementationSchema = BaseMetadataSchema.extend({
	...BaseMetadataSchema.shape,
	...IconsSchema.shape,
	version: string(),
	websiteUrl: string().optional(),
	description: string().optional()
});
const ElicitationCapabilitySchema = preprocess((value) => {
	if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return { form: {} };
	return value;
}, intersection(object({
	form: intersection(object({ applyDefaults: boolean().optional() }), JSONObjectSchema).optional(),
	url: JSONObjectSchema.optional()
}), JSONObjectSchema.optional()));
/**
* Task capabilities for clients, indicating which request types support task creation.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const ClientTasksCapabilitySchema = looseObject({
	list: JSONObjectSchema.optional(),
	cancel: JSONObjectSchema.optional(),
	requests: looseObject({
		sampling: looseObject({ createMessage: JSONObjectSchema.optional() }).optional(),
		elicitation: looseObject({ create: JSONObjectSchema.optional() }).optional()
	}).optional()
});
/**
* Task capabilities for servers, indicating which request types support task creation.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const ServerTasksCapabilitySchema = looseObject({
	list: JSONObjectSchema.optional(),
	cancel: JSONObjectSchema.optional(),
	requests: looseObject({ tools: looseObject({ call: JSONObjectSchema.optional() }).optional() }).optional()
});
/**
* Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.
*/
const ClientCapabilitiesSchema = object({
	experimental: record(string(), JSONObjectSchema).optional(),
	sampling: object({
		context: JSONObjectSchema.optional(),
		tools: JSONObjectSchema.optional()
	}).optional(),
	elicitation: ElicitationCapabilitySchema.optional(),
	roots: object({ listChanged: boolean().optional() }).optional(),
	tasks: ClientTasksCapabilitySchema.optional(),
	extensions: record(string(), JSONObjectSchema).optional()
});
const InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
	protocolVersion: string(),
	capabilities: ClientCapabilitiesSchema,
	clientInfo: ImplementationSchema
});
/**
* This request is sent from the client to the server when it first connects, asking it to begin initialization.
*/
const InitializeRequestSchema = RequestSchema.extend({
	method: literal("initialize"),
	params: InitializeRequestParamsSchema
});
/**
* Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.
*/
const ServerCapabilitiesSchema = object({
	experimental: record(string(), JSONObjectSchema).optional(),
	logging: JSONObjectSchema.optional(),
	completions: JSONObjectSchema.optional(),
	prompts: object({ listChanged: boolean().optional() }).optional(),
	resources: object({
		subscribe: boolean().optional(),
		listChanged: boolean().optional()
	}).optional(),
	tools: object({ listChanged: boolean().optional() }).optional(),
	tasks: ServerTasksCapabilitySchema.optional(),
	extensions: record(string(), JSONObjectSchema).optional()
});
/**
* After receiving an initialize request from the client, the server sends this response.
*/
const InitializeResultSchema = ResultSchema.extend({
	protocolVersion: string(),
	capabilities: ServerCapabilitiesSchema,
	serverInfo: ImplementationSchema,
	instructions: string().optional()
});
/**
* This notification is sent from the client to the server after initialization has finished.
*/
const InitializedNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/initialized"),
	params: NotificationsParamsSchema.optional()
});
/**
* A request from the client asking the server to advertise its supported protocol
* versions, capabilities, and other metadata (protocol revision 2026-07-28). Servers
* MUST implement `server/discover`. Clients MAY call it but are not required to —
* version negotiation can also happen inline via the per-request `_meta` envelope.
*/
const DiscoverRequestSchema = RequestSchema.extend({
	method: literal("server/discover"),
	params: BaseRequestParamsSchema.optional()
});
/**
* The result returned by the server for a `server/discover` request.
*/
const DiscoverResultSchema = ResultSchema.extend({
	supportedVersions: array(string()),
	capabilities: ServerCapabilitiesSchema,
	instructions: string().optional()
});
/**
* A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.
*/
const PingRequestSchema = RequestSchema.extend({
	method: literal("ping"),
	params: BaseRequestParamsSchema.optional()
});
const ProgressSchema = object({
	progress: number$1(),
	total: optional(number$1()),
	message: optional(string())
});
const ProgressNotificationParamsSchema = object({
	...NotificationsParamsSchema.shape,
	...ProgressSchema.shape,
	progressToken: ProgressTokenSchema
});
/**
* An out-of-band notification used to inform the receiver of a progress update for a long-running request.
*
* @category notifications/progress
*/
const ProgressNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/progress"),
	params: ProgressNotificationParamsSchema
});
const PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({ cursor: CursorSchema.optional() });
const PaginatedRequestSchema = RequestSchema.extend({ params: PaginatedRequestParamsSchema.optional() });
const PaginatedResultSchema = ResultSchema.extend({ nextCursor: CursorSchema.optional() });
/**
* The contents of a specific resource or sub-resource.
*/
const ResourceContentsSchema = object({
	uri: string(),
	mimeType: optional(string()),
	_meta: record(string(), unknown()).optional()
});
const TextResourceContentsSchema = ResourceContentsSchema.extend({ text: string() });
/**
* A Zod schema for validating Base64 strings that is more performant and
* robust for very large inputs than the default regex-based check. It avoids
* stack overflows by using the native `atob` function for validation.
*/
const Base64Schema = string().refine((val) => {
	try {
		atob(val);
		return true;
	} catch {
		return false;
	}
}, { message: "Invalid Base64 string" });
const BlobResourceContentsSchema = ResourceContentsSchema.extend({ blob: Base64Schema });
/**
* The sender or recipient of messages and data in a conversation.
*/
const RoleSchema = _enum(["user", "assistant"]);
/**
* Optional annotations providing clients additional context about a resource.
*/
const AnnotationsSchema = object({
	audience: array(RoleSchema).optional(),
	priority: number$1().min(0).max(1).optional(),
	lastModified: datetime({ offset: true }).optional()
});
/**
* A known resource that the server is capable of reading.
*/
const ResourceSchema = object({
	...BaseMetadataSchema.shape,
	...IconsSchema.shape,
	uri: string(),
	description: optional(string()),
	mimeType: optional(string()),
	size: optional(number$1()),
	annotations: AnnotationsSchema.optional(),
	_meta: optional(looseObject({}))
});
/**
* A template description for resources available on the server.
*/
const ResourceTemplateSchema = object({
	...BaseMetadataSchema.shape,
	...IconsSchema.shape,
	uriTemplate: string(),
	description: optional(string()),
	mimeType: optional(string()),
	annotations: AnnotationsSchema.optional(),
	_meta: optional(looseObject({}))
});
/**
* Sent from the client to request a list of resources the server has.
*/
const ListResourcesRequestSchema = PaginatedRequestSchema.extend({ method: literal("resources/list") });
/**
* The server's response to a {@linkcode ListResourcesRequest | resources/list} request from the client.
*/
const ListResourcesResultSchema = PaginatedResultSchema.extend({ resources: array(ResourceSchema) });
/**
* Sent from the client to request a list of resource templates the server has.
*/
const ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({ method: literal("resources/templates/list") });
/**
* The server's response to a {@linkcode ListResourceTemplatesRequest | resources/templates/list} request from the client.
*/
const ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({ resourceTemplates: array(ResourceTemplateSchema) });
const ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({ uri: string() });
/**
* Parameters for a {@linkcode ReadResourceRequest | resources/read} request.
*/
const ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
/**
* Sent from the client to the server, to read a specific resource URI.
*/
const ReadResourceRequestSchema = RequestSchema.extend({
	method: literal("resources/read"),
	params: ReadResourceRequestParamsSchema
});
/**
* The server's response to a {@linkcode ReadResourceRequest | resources/read} request from the client.
*/
const ReadResourceResultSchema = ResultSchema.extend({ contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema])) });
/**
* An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.
*/
const ResourceListChangedNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/resources/list_changed"),
	params: NotificationsParamsSchema.optional()
});
const SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
/**
* Sent from the client to request `resources/updated` notifications from the server whenever a particular resource changes.
*/
const SubscribeRequestSchema = RequestSchema.extend({
	method: literal("resources/subscribe"),
	params: SubscribeRequestParamsSchema
});
const UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
/**
* Sent from the client to request cancellation of {@linkcode ResourceUpdatedNotification | resources/updated} notifications from the server. This should follow a previous {@linkcode SubscribeRequest | resources/subscribe} request.
*/
const UnsubscribeRequestSchema = RequestSchema.extend({
	method: literal("resources/unsubscribe"),
	params: UnsubscribeRequestParamsSchema
});
/**
* The set of notification types a client opts in to on a `subscriptions/listen`
* request. Each type is opt-in; the server MUST NOT send a notification type
* the client has not explicitly requested here.
*/
const SubscriptionFilterSchema = object({
	toolsListChanged: boolean().optional(),
	promptsListChanged: boolean().optional(),
	resourcesListChanged: boolean().optional(),
	resourceSubscriptions: array(string()).optional()
});
const SubscriptionsListenRequestParamsSchema = BaseRequestParamsSchema.extend({ notifications: SubscriptionFilterSchema });
/**
* Sent from the client to open a long-lived channel for receiving notifications
* outside the context of a specific request (protocol revision 2026-07-28).
* Replaces the previous HTTP GET endpoint and `resources/subscribe`.
*/
const SubscriptionsListenRequestSchema = RequestSchema.extend({
	method: literal("subscriptions/listen"),
	params: SubscriptionsListenRequestParamsSchema
});
const SubscriptionsAcknowledgedNotificationParamsSchema = NotificationsParamsSchema.extend({ notifications: SubscriptionFilterSchema });
/**
* Sent by the server as the first message on a `subscriptions/listen` stream
* to acknowledge that the subscription has been established and report which
* notification types it agreed to honor (protocol revision 2026-07-28).
*/
const SubscriptionsAcknowledgedNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/subscriptions/acknowledged"),
	params: SubscriptionsAcknowledgedNotificationParamsSchema
});
/**
* `_meta` for a {@linkcode SubscriptionsListenResult}: the listen request's
* JSON-RPC ID under the canonical subscription-id key (mirroring the same key
* on every notification delivered on the stream). Extends
* {@linkcode ResultMetaObjectSchema}, so the optional serverInfo key is typed
* here too.
*/
const SubscriptionsListenResultMetaSchema = ResultMetaObjectSchema.extend({ [SUBSCRIPTION_ID_META_KEY]: RequestIdSchema });
/**
* The response to a `subscriptions/listen` request, signalling that the
* subscription has ended gracefully (for example, during server shutdown).
* Because the listen stream is long-lived, this result is sent only when the
* server tears the subscription down; an abrupt transport close carries no
* response. The result body is otherwise empty.
*/
const SubscriptionsListenResultSchema = ResultSchema.extend({ _meta: SubscriptionsListenResultMetaSchema });
/**
* Parameters for a {@linkcode ResourceUpdatedNotification | notifications/resources/updated} notification.
*/
const ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({ uri: string() });
/**
* A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a {@linkcode SubscribeRequest | resources/subscribe} request.
*/
const ResourceUpdatedNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/resources/updated"),
	params: ResourceUpdatedNotificationParamsSchema
});
/**
* Describes an argument that a prompt can accept.
*/
const PromptArgumentSchema = object({
	name: string(),
	description: optional(string()),
	required: optional(boolean())
});
/**
* A prompt or prompt template that the server offers.
*/
const PromptSchema = object({
	...BaseMetadataSchema.shape,
	...IconsSchema.shape,
	description: optional(string()),
	arguments: optional(array(PromptArgumentSchema)),
	_meta: optional(looseObject({}))
});
/**
* Sent from the client to request a list of prompts and prompt templates the server has.
*/
const ListPromptsRequestSchema = PaginatedRequestSchema.extend({ method: literal("prompts/list") });
/**
* The server's response to a {@linkcode ListPromptsRequest | prompts/list} request from the client.
*/
const ListPromptsResultSchema = PaginatedResultSchema.extend({ prompts: array(PromptSchema) });
/**
* Parameters for a {@linkcode GetPromptRequest | prompts/get} request.
*/
const GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
	name: string(),
	arguments: record(string(), string()).optional()
});
/**
* Used by the client to get a prompt provided by the server.
*/
const GetPromptRequestSchema = RequestSchema.extend({
	method: literal("prompts/get"),
	params: GetPromptRequestParamsSchema
});
/**
* Text provided to or from an LLM.
*/
const TextContentSchema = object({
	type: literal("text"),
	text: string(),
	annotations: AnnotationsSchema.optional(),
	_meta: record(string(), unknown()).optional()
});
/**
* An image provided to or from an LLM.
*/
const ImageContentSchema = object({
	type: literal("image"),
	data: Base64Schema,
	mimeType: string(),
	annotations: AnnotationsSchema.optional(),
	_meta: record(string(), unknown()).optional()
});
/**
* Audio content provided to or from an LLM.
*/
const AudioContentSchema = object({
	type: literal("audio"),
	data: Base64Schema,
	mimeType: string(),
	annotations: AnnotationsSchema.optional(),
	_meta: record(string(), unknown()).optional()
});
/**
* A tool call request from an assistant (LLM).
* Represents the assistant's request to use a tool.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const ToolUseContentSchema = object({
	type: literal("tool_use"),
	name: string(),
	id: string(),
	input: record(string(), unknown()),
	_meta: record(string(), unknown()).optional()
});
/**
* The contents of a resource, embedded into a prompt or tool call result.
*/
const EmbeddedResourceSchema = object({
	type: literal("resource"),
	resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
	annotations: AnnotationsSchema.optional(),
	_meta: record(string(), unknown()).optional()
});
/**
* A resource that the server is capable of reading, included in a prompt or tool call result.
*
* Note: resource links returned by tools are not guaranteed to appear in the results of {@linkcode ListResourcesRequest | resources/list} requests.
*/
const ResourceLinkSchema = ResourceSchema.extend({ type: literal("resource_link") });
/**
* A content block that can be used in prompts and tool results.
*/
const ContentBlockSchema = union([
	TextContentSchema,
	ImageContentSchema,
	AudioContentSchema,
	ResourceLinkSchema,
	EmbeddedResourceSchema
]);
/**
* Describes a message returned as part of a prompt.
*/
const PromptMessageSchema = object({
	role: RoleSchema,
	content: ContentBlockSchema
});
/**
* The server's response to a {@linkcode GetPromptRequest | prompts/get} request from the client.
*/
const GetPromptResultSchema = ResultSchema.extend({
	description: string().optional(),
	messages: array(PromptMessageSchema)
});
/**
* An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This may be issued by servers without any previous subscription from the client.
*/
const PromptListChangedNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/prompts/list_changed"),
	params: NotificationsParamsSchema.optional()
});
/**
* Additional properties describing a `Tool` to clients.
*
* NOTE: all properties in {@linkcode ToolAnnotations} are **hints**.
* They are not guaranteed to provide a faithful description of
* tool behavior (including descriptive properties like `title`).
*
* Clients should never make tool use decisions based on `ToolAnnotations`
* received from untrusted servers.
*/
const ToolAnnotationsSchema = object({
	title: string().optional(),
	readOnlyHint: boolean().optional(),
	destructiveHint: boolean().optional(),
	idempotentHint: boolean().optional(),
	openWorldHint: boolean().optional()
});
/**
* Execution-related properties for a tool.
*/
const ToolExecutionSchema = object({ taskSupport: _enum([
	"required",
	"optional",
	"forbidden"
]).optional() });
/**
* Definition for a tool the client can call.
*/
const ToolSchema = object({
	...BaseMetadataSchema.shape,
	...IconsSchema.shape,
	description: string().optional(),
	inputSchema: object({
		type: literal("object"),
		properties: record(string(), JSONValueSchema).optional(),
		required: array(string()).optional()
	}).catchall(unknown()),
	outputSchema: looseObject({ $schema: string().optional() }).optional(),
	annotations: ToolAnnotationsSchema.optional(),
	execution: ToolExecutionSchema.optional(),
	_meta: record(string(), unknown()).optional()
});
/**
* Sent from the client to request a list of tools the server has.
*/
const ListToolsRequestSchema = PaginatedRequestSchema.extend({ method: literal("tools/list") });
/**
* The server's response to a {@linkcode ListToolsRequest | tools/list} request from the client.
*/
const ListToolsResultSchema = PaginatedResultSchema.extend({ tools: array(ToolSchema) });
/**
* The server's response to a tool call.
*/
const CallToolResultSchema = ResultSchema.extend({
	content: array(ContentBlockSchema).default([]),
	structuredContent: unknown().optional(),
	isError: boolean().optional()
});
/**
* {@linkcode CallToolResultSchema} extended with backwards compatibility to protocol version 2024-10-07.
*/
const CompatibilityCallToolResultSchema = CallToolResultSchema.or(ResultSchema.extend({ toolResult: unknown() }));
/**
* Parameters for a `tools/call` request.
*/
const CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
	name: string(),
	arguments: record(string(), unknown()).optional()
});
/**
* Used by the client to invoke a tool provided by the server.
*/
const CallToolRequestSchema = RequestSchema.extend({
	method: literal("tools/call"),
	params: CallToolRequestParamsSchema
});
/**
* An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.
*/
const ToolListChangedNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/tools/list_changed"),
	params: NotificationsParamsSchema.optional()
});
/**
* Base schema for list changed subscription options (without callback).
* Used internally for Zod validation of `autoRefresh` and `debounceMs`.
*/
const ListChangedOptionsBaseSchema = object({
	autoRefresh: boolean().default(true),
	debounceMs: number$1().int().nonnegative().default(300)
});
/**
* The severity of a log message.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to stderr logging
* (STDIO servers) or OpenTelemetry.
*/
const LoggingLevelSchema = _enum([
	"debug",
	"info",
	"notice",
	"warning",
	"error",
	"critical",
	"alert",
	"emergency"
]);
/**
* Parameters for a `logging/setLevel` request.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to stderr logging
* (STDIO servers) or OpenTelemetry.
*/
const SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({ level: LoggingLevelSchema });
/**
* A request from the client to the server, to enable or adjust logging.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to stderr logging
* (STDIO servers) or OpenTelemetry.
*/
const SetLevelRequestSchema = RequestSchema.extend({
	method: literal("logging/setLevel"),
	params: SetLevelRequestParamsSchema
});
/**
* Parameters for a `notifications/message` notification.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to stderr logging
* (STDIO servers) or OpenTelemetry.
*/
const LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
	level: LoggingLevelSchema,
	logger: string().optional(),
	data: unknown()
});
/**
* Notification of a log message passed from server to client. If no `logging/setLevel` request has been sent from the client, the server MAY decide which messages to send automatically.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to stderr logging
* (STDIO servers) or OpenTelemetry.
*/
const LoggingMessageNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/message"),
	params: LoggingMessageNotificationParamsSchema
});
/**
* Hints to use for model selection.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const ModelHintSchema = object({ name: string().optional() });
/**
* The server's preferences for model selection, requested of the client during sampling.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const ModelPreferencesSchema = object({
	hints: array(ModelHintSchema).optional(),
	costPriority: number$1().min(0).max(1).optional(),
	speedPriority: number$1().min(0).max(1).optional(),
	intelligencePriority: number$1().min(0).max(1).optional()
});
/**
* Controls tool usage behavior in sampling requests.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const ToolChoiceSchema = object({ mode: _enum([
	"auto",
	"required",
	"none"
]).optional() });
/**
* The result of a tool execution, provided by the user (server).
* Represents the outcome of invoking a tool requested via `ToolUseContent`.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const ToolResultContentSchema = object({
	type: literal("tool_result"),
	toolUseId: string().describe("The unique identifier for the corresponding tool call."),
	content: array(ContentBlockSchema),
	structuredContent: unknown().optional(),
	isError: boolean().optional(),
	_meta: record(string(), unknown()).optional()
});
/**
* Basic content types for sampling responses (without tool use).
* Used for backwards-compatible {@linkcode CreateMessageResult} when tools are not used.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const SamplingContentSchema = discriminatedUnion("type", [
	TextContentSchema,
	ImageContentSchema,
	AudioContentSchema
]);
/**
* Content block types allowed in sampling messages.
* This includes text, image, audio, tool use requests, and tool results.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const SamplingMessageContentBlockSchema = discriminatedUnion("type", [
	TextContentSchema,
	ImageContentSchema,
	AudioContentSchema,
	ToolUseContentSchema,
	ToolResultContentSchema
]);
/**
* Describes a message issued to or received from an LLM API.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const SamplingMessageSchema = object({
	role: RoleSchema,
	content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
	_meta: record(string(), unknown()).optional()
});
/**
* Parameters for a `sampling/createMessage` request.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
	messages: array(SamplingMessageSchema),
	modelPreferences: ModelPreferencesSchema.optional(),
	systemPrompt: string().optional(),
	includeContext: _enum([
		"none",
		"thisServer",
		"allServers"
	]).optional(),
	temperature: number$1().optional(),
	maxTokens: number$1().int(),
	stopSequences: array(string()).optional(),
	metadata: JSONObjectSchema.optional(),
	tools: array(ToolSchema).optional(),
	toolChoice: ToolChoiceSchema.optional()
});
/**
* A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const CreateMessageRequestSchema = RequestSchema.extend({
	method: literal("sampling/createMessage"),
	params: CreateMessageRequestParamsSchema
});
/**
* The client's response to a `sampling/create_message` request from the server.
* This is the backwards-compatible version that returns single content (no arrays).
* Used when the request does not include tools.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const CreateMessageResultSchema = ResultSchema.extend({
	model: string(),
	stopReason: optional(_enum([
		"endTurn",
		"stopSequence",
		"maxTokens"
	]).or(string())),
	role: RoleSchema,
	content: SamplingContentSchema
});
/**
* The client's response to a `sampling/create_message` request when tools were provided.
* This version supports array content for tool use flows.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to calling LLM
* provider APIs directly.
*/
const CreateMessageResultWithToolsSchema = ResultSchema.extend({
	model: string(),
	stopReason: optional(_enum([
		"endTurn",
		"stopSequence",
		"maxTokens",
		"toolUse"
	]).or(string())),
	role: RoleSchema,
	content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)])
});
/**
* Primitive schema definition for boolean fields.
*/
const BooleanSchemaSchema = object({
	type: literal("boolean"),
	title: string().optional(),
	description: string().optional(),
	default: boolean().optional()
});
/**
* Primitive schema definition for string fields.
*/
const StringSchemaSchema = object({
	type: literal("string"),
	title: string().optional(),
	description: string().optional(),
	minLength: number$1().optional(),
	maxLength: number$1().optional(),
	format: _enum([
		"email",
		"uri",
		"date",
		"date-time"
	]).optional(),
	default: string().optional()
});
/**
* Primitive schema definition for number fields.
*/
const NumberSchemaSchema = object({
	type: _enum(["number", "integer"]),
	title: string().optional(),
	description: string().optional(),
	minimum: number$1().optional(),
	maximum: number$1().optional(),
	default: number$1().optional()
});
/**
* Schema for single-selection enumeration without display titles for options.
*/
const UntitledSingleSelectEnumSchemaSchema = object({
	type: literal("string"),
	title: string().optional(),
	description: string().optional(),
	enum: array(string()),
	default: string().optional()
});
/**
* Schema for single-selection enumeration with display titles for each option.
*/
const TitledSingleSelectEnumSchemaSchema = object({
	type: literal("string"),
	title: string().optional(),
	description: string().optional(),
	oneOf: array(object({
		const: string(),
		title: string()
	})),
	default: string().optional()
});
/**
* Use {@linkcode TitledSingleSelectEnumSchema} instead.
* This interface will be removed in a future version.
*/
const LegacyTitledEnumSchemaSchema = object({
	type: literal("string"),
	title: string().optional(),
	description: string().optional(),
	enum: array(string()),
	enumNames: array(string()).optional(),
	default: string().optional()
});
const SingleSelectEnumSchemaSchema = union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]);
/**
* Schema for multiple-selection enumeration without display titles for options.
*/
const UntitledMultiSelectEnumSchemaSchema = object({
	type: literal("array"),
	title: string().optional(),
	description: string().optional(),
	minItems: number$1().optional(),
	maxItems: number$1().optional(),
	items: object({
		type: literal("string"),
		enum: array(string())
	}),
	default: array(string()).optional()
});
/**
* Schema for multiple-selection enumeration with display titles for each option.
*/
const TitledMultiSelectEnumSchemaSchema = object({
	type: literal("array"),
	title: string().optional(),
	description: string().optional(),
	minItems: number$1().optional(),
	maxItems: number$1().optional(),
	items: object({ anyOf: array(object({
		const: string(),
		title: string()
	})) }),
	default: array(string()).optional()
});
/**
* Combined schema for multiple-selection enumeration
*/
const MultiSelectEnumSchemaSchema = union([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]);
/**
* Primitive schema definition for enum fields.
*/
const EnumSchemaSchema = union([
	LegacyTitledEnumSchemaSchema,
	SingleSelectEnumSchemaSchema,
	MultiSelectEnumSchemaSchema
]);
/**
* Union of all primitive schema definitions.
*/
const PrimitiveSchemaDefinitionSchema = union([
	EnumSchemaSchema,
	BooleanSchemaSchema,
	StringSchemaSchema,
	NumberSchemaSchema
]);
/**
* Parameters for an `elicitation/create` request for form-based elicitation.
*/
const ElicitRequestFormParamsSchema = TaskAugmentedRequestParamsSchema.extend({
	mode: literal("form").optional(),
	message: string(),
	requestedSchema: object({
		type: literal("object"),
		properties: record(string(), PrimitiveSchemaDefinitionSchema),
		required: array(string()).optional()
	}).catchall(unknown())
});
/**
* Parameters for an {@linkcode ElicitRequest | elicitation/create} request for URL-based elicitation.
*/
const ElicitRequestURLParamsSchema = TaskAugmentedRequestParamsSchema.extend({
	mode: literal("url"),
	message: string(),
	elicitationId: string(),
	url: string().url()
});
/**
* The parameters for a request to elicit additional information from the user via the client.
*/
const ElicitRequestParamsSchema = union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
/**
* A request from the server to elicit user input via the client.
* The client should present the message and form fields to the user (form mode)
* or navigate to a URL (URL mode).
*/
const ElicitRequestSchema = RequestSchema.extend({
	method: literal("elicitation/create"),
	params: ElicitRequestParamsSchema
});
/**
* Parameters for a {@linkcode ElicitationCompleteNotification | notifications/elicitation/complete} notification.
*
* @deprecated Removed from the spec by #2891 (2026-07-28). The client learns the outcome
* of an out-of-band interaction by retrying the original request; no server-initiated
* completion signal exists in the 2026-07-28 revision. Kept here for the 2025-era flow
* only. The 2026-07-28 wire codec excludes this notification.
* @category notifications/elicitation/complete
*/
const ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({ elicitationId: string() });
/**
* A notification from the server to the client, informing it of a completion of an out-of-band elicitation request.
*
* @deprecated Removed from the spec by #2891 (2026-07-28). The client learns the outcome
* of an out-of-band interaction by retrying the original request; no server-initiated
* completion signal exists in the 2026-07-28 revision. Kept here for the 2025-era flow
* only. The 2026-07-28 wire codec excludes this notification.
* @category notifications/elicitation/complete
*/
const ElicitationCompleteNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/elicitation/complete"),
	params: ElicitationCompleteNotificationParamsSchema
});
/**
* The client's response to an {@linkcode ElicitRequest | elicitation/create} request from the server.
*/
const ElicitResultSchema = ResultSchema.extend({
	action: _enum([
		"accept",
		"decline",
		"cancel"
	]),
	content: preprocess((val) => val === null ? void 0 : val, record(string(), union([
		string(),
		number$1(),
		boolean(),
		array(string())
	])).optional())
});
/**
* A reference to a resource or resource template definition.
*/
const ResourceTemplateReferenceSchema = object({
	type: literal("ref/resource"),
	uri: string()
});
/**
* Identifies a prompt.
*/
const PromptReferenceSchema = object({
	type: literal("ref/prompt"),
	name: string()
});
/**
* Parameters for a {@linkcode CompleteRequest | completion/complete} request.
*/
const CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
	ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
	argument: object({
		name: string(),
		value: string()
	}),
	context: object({ arguments: record(string(), string()).optional() }).optional()
});
/**
* A request from the client to the server, to ask for completion options.
*/
const CompleteRequestSchema = RequestSchema.extend({
	method: literal("completion/complete"),
	params: CompleteRequestParamsSchema
});
/**
* The server's response to a {@linkcode CompleteRequest | completion/complete} request
*/
const CompleteResultSchema = ResultSchema.extend({ completion: looseObject({
	values: array(string()).max(100),
	total: optional(number$1().int()),
	hasMore: optional(boolean())
}) });
/**
* Represents a root directory or file that the server can operate on.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to passing paths via
* tool parameters, resource URIs, or configuration.
*/
const RootSchema = object({
	uri: string().startsWith("file://"),
	name: string().optional(),
	_meta: record(string(), unknown()).optional()
});
/**
* Sent from the server to request a list of root URIs from the client.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to passing paths via
* tool parameters, resource URIs, or configuration.
*/
const ListRootsRequestSchema = RequestSchema.extend({
	method: literal("roots/list"),
	params: BaseRequestParamsSchema.optional()
});
/**
* The client's response to a `roots/list` request from the server.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to passing paths via
* tool parameters, resource URIs, or configuration.
*/
const ListRootsResultSchema = ResultSchema.extend({ roots: array(RootSchema) });
/**
* A notification from the client to the server, informing it that the list of roots has changed.
*
* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
* in the specification for at least twelve months. Migrate to passing paths via
* tool parameters, resource URIs, or configuration.
*/
const RootsListChangedNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/roots/list_changed"),
	params: NotificationsParamsSchema.optional()
});
/**
* Task creation parameters, used to ask that the server create a task to represent a request.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const TaskCreationParamsSchema = looseObject({
	ttl: number$1().optional(),
	pollInterval: number$1().optional()
});
/**
* The status of a task.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const TaskStatusSchema = _enum([
	"working",
	"input_required",
	"completed",
	"failed",
	"cancelled"
]);
/**
* A pollable state object associated with a request.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const TaskSchema = object({
	taskId: string(),
	status: TaskStatusSchema,
	ttl: union([number$1(), _null()]),
	createdAt: string(),
	lastUpdatedAt: string(),
	pollInterval: optional(number$1()),
	statusMessage: optional(string())
});
/**
* Result returned when a task is created, containing the task data wrapped in a `task` field.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const CreateTaskResultSchema = ResultSchema.extend({ task: TaskSchema });
/**
* Parameters for task status notification.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
/**
* A notification sent when a task's status changes.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const TaskStatusNotificationSchema = NotificationSchema.extend({
	method: literal("notifications/tasks/status"),
	params: TaskStatusNotificationParamsSchema
});
/**
* A request to get the state of a specific task.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const GetTaskRequestSchema = RequestSchema.extend({
	method: literal("tasks/get"),
	params: BaseRequestParamsSchema.extend({ taskId: string() })
});
/**
* The response to a {@linkcode GetTaskRequest | tasks/get} request.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const GetTaskResultSchema = ResultSchema.merge(TaskSchema);
/**
* A request to get the result of a specific task.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const GetTaskPayloadRequestSchema = RequestSchema.extend({
	method: literal("tasks/result"),
	params: BaseRequestParamsSchema.extend({ taskId: string() })
});
/**
* The response to a `tasks/result` request.
* The structure matches the result type of the original request.
* For example, a {@linkcode CallToolRequest | tools/call} task would return the `CallToolResult` structure.
*
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const GetTaskPayloadResultSchema = ResultSchema.loose();
/**
* A request to list tasks.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const ListTasksRequestSchema = PaginatedRequestSchema.extend({ method: literal("tasks/list") });
/**
* The response to a {@linkcode ListTasksRequest | tasks/list} request.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const ListTasksResultSchema = PaginatedResultSchema.extend({ tasks: array(TaskSchema) });
/**
* A request to cancel a specific task.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const CancelTaskRequestSchema = RequestSchema.extend({
	method: literal("tasks/cancel"),
	params: BaseRequestParamsSchema.extend({ taskId: string() })
});
/**
* The response to a {@linkcode CancelTaskRequest | tasks/cancel} request.
*
* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
*/
const CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
const ClientRequestSchema = union([
	PingRequestSchema,
	InitializeRequestSchema,
	DiscoverRequestSchema,
	CompleteRequestSchema,
	SetLevelRequestSchema,
	GetPromptRequestSchema,
	ListPromptsRequestSchema,
	ListResourcesRequestSchema,
	ListResourceTemplatesRequestSchema,
	ReadResourceRequestSchema,
	SubscribeRequestSchema,
	UnsubscribeRequestSchema,
	SubscriptionsListenRequestSchema,
	CallToolRequestSchema,
	ListToolsRequestSchema
]);
const ClientNotificationSchema = union([
	CancelledNotificationSchema,
	ProgressNotificationSchema,
	InitializedNotificationSchema,
	RootsListChangedNotificationSchema
]);
const ClientResultSchema = union([
	EmptyResultSchema,
	CreateMessageResultSchema,
	CreateMessageResultWithToolsSchema,
	ElicitResultSchema,
	ListRootsResultSchema
]);
const ServerRequestSchema = union([
	PingRequestSchema,
	CreateMessageRequestSchema,
	ElicitRequestSchema,
	ListRootsRequestSchema
]);
const ServerNotificationSchema = union([
	CancelledNotificationSchema,
	ProgressNotificationSchema,
	LoggingMessageNotificationSchema,
	ResourceUpdatedNotificationSchema,
	ResourceListChangedNotificationSchema,
	ToolListChangedNotificationSchema,
	PromptListChangedNotificationSchema,
	SubscriptionsAcknowledgedNotificationSchema,
	ElicitationCompleteNotificationSchema
]);
const ServerResultSchema = union([
	EmptyResultSchema,
	InitializeResultSchema,
	DiscoverResultSchema,
	CompleteResultSchema,
	GetPromptResultSchema,
	ListPromptsResultSchema,
	ListResourcesResultSchema,
	ListResourceTemplatesResultSchema,
	ReadResourceResultSchema,
	CallToolResultSchema,
	ListToolsResultSchema,
	SubscriptionsListenResultSchema
]);
/**
* Reusable URL validation that disallows `javascript:` scheme
*/
const SafeUrlSchema = url().superRefine((val, ctx) => {
	if (!URL.canParse(val)) {
		ctx.addIssue({
			code: ZodIssueCode.custom,
			message: "URL must be parseable",
			fatal: true
		});
		return NEVER;
	}
}).refine((url) => {
	const u = new URL(url);
	return u.protocol !== "javascript:" && u.protocol !== "data:" && u.protocol !== "vbscript:";
}, { message: "URL cannot use javascript:, data:, or vbscript: scheme" });
/**
* RFC 9728 OAuth Protected Resource Metadata
*/
const OAuthProtectedResourceMetadataSchema = looseObject({
	resource: string().url(),
	authorization_servers: array(SafeUrlSchema).optional(),
	jwks_uri: string().url().optional(),
	scopes_supported: array(string()).optional(),
	bearer_methods_supported: array(string()).optional(),
	resource_signing_alg_values_supported: array(string()).optional(),
	resource_name: string().optional(),
	resource_documentation: string().optional(),
	resource_policy_uri: string().url().optional(),
	resource_tos_uri: string().url().optional(),
	tls_client_certificate_bound_access_tokens: boolean().optional(),
	authorization_details_types_supported: array(string()).optional(),
	dpop_signing_alg_values_supported: array(string()).optional(),
	dpop_bound_access_tokens_required: boolean().optional()
});
/**
* RFC 8414 OAuth 2.0 Authorization Server Metadata
*/
const OAuthMetadataSchema = looseObject({
	issuer: string(),
	authorization_endpoint: SafeUrlSchema,
	token_endpoint: SafeUrlSchema,
	registration_endpoint: SafeUrlSchema.optional(),
	scopes_supported: array(string()).optional(),
	response_types_supported: array(string()),
	response_modes_supported: array(string()).optional(),
	grant_types_supported: array(string()).optional(),
	token_endpoint_auth_methods_supported: array(string()).optional(),
	token_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
	service_documentation: SafeUrlSchema.optional(),
	revocation_endpoint: SafeUrlSchema.optional(),
	revocation_endpoint_auth_methods_supported: array(string()).optional(),
	revocation_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
	introspection_endpoint: string().optional(),
	introspection_endpoint_auth_methods_supported: array(string()).optional(),
	introspection_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
	code_challenge_methods_supported: array(string()).optional(),
	client_id_metadata_document_supported: boolean().optional(),
	authorization_response_iss_parameter_supported: boolean().optional().catch(void 0),
	dpop_signing_alg_values_supported: array(string()).optional()
});
/**
* OpenID Connect Discovery 1.0 Provider Metadata
*
* @see https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata
*/
const OpenIdProviderMetadataSchema = looseObject({
	issuer: string(),
	authorization_endpoint: SafeUrlSchema,
	token_endpoint: SafeUrlSchema,
	userinfo_endpoint: SafeUrlSchema.optional(),
	jwks_uri: SafeUrlSchema,
	registration_endpoint: SafeUrlSchema.optional(),
	scopes_supported: array(string()).optional(),
	response_types_supported: array(string()),
	response_modes_supported: array(string()).optional(),
	grant_types_supported: array(string()).optional(),
	acr_values_supported: array(string()).optional(),
	subject_types_supported: array(string()),
	id_token_signing_alg_values_supported: array(string()),
	id_token_encryption_alg_values_supported: array(string()).optional(),
	id_token_encryption_enc_values_supported: array(string()).optional(),
	userinfo_signing_alg_values_supported: array(string()).optional(),
	userinfo_encryption_alg_values_supported: array(string()).optional(),
	userinfo_encryption_enc_values_supported: array(string()).optional(),
	request_object_signing_alg_values_supported: array(string()).optional(),
	request_object_encryption_alg_values_supported: array(string()).optional(),
	request_object_encryption_enc_values_supported: array(string()).optional(),
	token_endpoint_auth_methods_supported: array(string()).optional(),
	token_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
	display_values_supported: array(string()).optional(),
	claim_types_supported: array(string()).optional(),
	claims_supported: array(string()).optional(),
	service_documentation: string().optional(),
	claims_locales_supported: array(string()).optional(),
	ui_locales_supported: array(string()).optional(),
	claims_parameter_supported: boolean().optional(),
	request_parameter_supported: boolean().optional(),
	request_uri_parameter_supported: boolean().optional(),
	require_request_uri_registration: boolean().optional(),
	op_policy_uri: SafeUrlSchema.optional(),
	op_tos_uri: SafeUrlSchema.optional(),
	client_id_metadata_document_supported: boolean().optional(),
	authorization_response_iss_parameter_supported: boolean().optional().catch(void 0)
});
/**
* OpenID Connect Discovery metadata that may include OAuth 2.0 fields
* This schema represents the real-world scenario where OIDC providers
* return a mix of OpenID Connect and OAuth 2.0 metadata fields
*/
const OpenIdProviderDiscoveryMetadataSchema = object({
	...OpenIdProviderMetadataSchema.shape,
	...OAuthMetadataSchema.pick({ code_challenge_methods_supported: true }).shape
});
/**
* OAuth 2.1 token response
*/
const OAuthTokensSchema = object({
	access_token: string(),
	id_token: string().optional(),
	token_type: string(),
	expires_in: number().optional(),
	scope: string().optional(),
	refresh_token: string().optional(),
	issuer: string().optional().catch(void 0)
}).strip();
/**
* RFC 8693 §2.2.1 Token Exchange response for ID-JAG tokens.
*
* `token_type` is intentionally optional: per RFC 8693 §2.2.1 it is informational when
* the issued token is not an access token, and per RFC 6749 §5.1 it is case-insensitive,
* so strict checking rejects conformant IdPs.
*/
const IdJagTokenExchangeResponseSchema = object({
	issued_token_type: literal("urn:ietf:params:oauth:token-type:id-jag"),
	access_token: string(),
	token_type: string().optional(),
	expires_in: number$1().optional(),
	scope: string().optional()
}).strip();
/**
* OAuth 2.1 error response
*/
const OAuthErrorResponseSchema = object({
	error: string(),
	error_description: string().optional(),
	error_uri: string().optional()
});
/**
* Optional version of {@linkcode SafeUrlSchema} that allows empty string for backward compatibility on `tos_uri` and `logo_uri`
*/
const OptionalSafeUrlSchema = SafeUrlSchema.optional().or(literal("").transform(() => void 0));
/**
* RFC 7591 OAuth 2.0 Dynamic Client Registration metadata
*/
const OAuthClientMetadataSchema = object({
	redirect_uris: array(SafeUrlSchema),
	token_endpoint_auth_method: string().optional(),
	grant_types: array(string()).optional(),
	response_types: array(string()).optional(),
	application_type: string().optional(),
	client_name: string().optional(),
	client_uri: SafeUrlSchema.optional(),
	logo_uri: OptionalSafeUrlSchema,
	scope: string().optional(),
	contacts: array(string()).optional(),
	tos_uri: OptionalSafeUrlSchema,
	policy_uri: string().optional(),
	jwks_uri: SafeUrlSchema.optional(),
	jwks: any().optional(),
	software_id: string().optional(),
	software_version: string().optional(),
	software_statement: string().optional()
}).strip();
/**
* RFC 7591 OAuth 2.0 Dynamic Client Registration client information
*/
const OAuthClientInformationSchema = object({
	client_id: string(),
	client_secret: string().optional(),
	client_id_issued_at: number$1().optional(),
	client_secret_expires_at: number$1().optional(),
	issuer: string().optional().catch(void 0)
}).strip();
/**
* RFC 7591 OAuth 2.0 Dynamic Client Registration full response (client information plus metadata)
*/
const OAuthClientInformationFullSchema = OAuthClientMetadataSchema.merge(OAuthClientInformationSchema);
/**
* RFC 7591 OAuth 2.0 Dynamic Client Registration error response
*/
const OAuthClientRegistrationErrorSchema = object({
	error: string(),
	error_description: string().optional()
}).strip();
/**
* RFC 7009 OAuth 2.0 Token Revocation request
*/
const OAuthTokenRevocationRequestSchema = object({
	token: string(),
	token_type_hint: string().optional()
}).strip();
//#endregion
//#region node_modules/@modelcontextprotocol/server/dist/src-Cqbh3MYc.mjs
/**
* Cross-bundle `instanceof` support for the SDK error classes.
*
* `@modelcontextprotocol/client` and `@modelcontextprotocol/server` each bundle their
* own copy of `core-internal`, so an error constructed by one package fails a
* prototype-identity `instanceof` against the same class re-exported by the other —
* exactly the check a dual-role process (gateway, host, in-process test) writes.
*
* Instead of prototype identity, branded classes stamp every instance with the brand
* strings of its class chain under a registry symbol (`Symbol.for`, shared across
* bundles and realms), and resolve `instanceof` via `Symbol.hasInstance` against the
* brand set. Ordinary prototype-based `instanceof` is kept as a fallback so behavior
* is unchanged for anything unbranded.
*
* A class participates by defining an **own** `mcpBrand` static (via a `static {}`
* block, so nothing reaches the declaration files — a declared `protected static`
* field would make the constructor types nominally incompatible across the bundled
* copies) and (for hierarchy roots) installing {@linkcode brandedHasInstance} as
* `Symbol.hasInstance`. User-defined subclasses that do not declare their own brand
* keep plain prototype semantics — a foreign base-class instance never satisfies
* `instanceof UserSubclass`.
*
* Prior art — the same stamp-and-hook shape ships at scale elsewhere: Node core
* (stream.Writable since 2017, Console via a marker symbol, diagnostics_channel),
* undici's whole error hierarchy (vendored into Node as fetch), googleapis/gaxios
* (GaxiosError, Symbol.for marker), AWS SDK v3's ServiceException (which pairs a
* Symbol.hasInstance override with a static isInstance guard, as we do), and zod v4
* (Symbol.hasInstance on every schema class for cross-version interop).
*
* Contract notes:
* - Participation criterion: **every error class exported from a public package that
*   callers are documented to `instanceof` must be branded.** The per-package
*   errorBrandConformance tests walk the export surfaces and fail naming any
*   exported Error subclass that has not opted in.
* - Brands assert **identity, not shape**: brand strings are version-less, so an
*   instance from one SDK version matches the class of another. Members added to a
*   branded class in a later version may be absent on a matched instance — read
*   fields defensively, and treat branded classes as additive-only. The escape
*   hatch when a release must break a branded class's read contract: change that
*   class's brand string in the same release, which cleanly severs cross-version
*   matching for that class. The per-package brand pins make the rename
*   deliberate: errorSurfacePins.test.ts owns the core-internal brands, and each
*   package's errorBrandConformance test pins its package-local ones.
* - Cross-bundle matching requires **both** copies to be at or after the release
*   that introduced branding; against an older copy, behavior degrades to plain
*   prototype `instanceof` in both directions.
* - A consumer re-bundling the SDK with property mangling (`mangle.props`) would
*   break the brand statics; default esbuild/webpack/terser settings do not.
*/
/** Registry symbol — identical across bundled copies and realms. */
const BRANDS = Symbol.for("mcp.sdk.errorBrands");
/**
* Stamp `instance` with the brand of every class in `ctor`'s chain that declares an
* own `mcpBrand`. Call once from the hierarchy root's constructor with `new.target` —
* subclasses inherit the stamping without touching their constructors.
*
* Constructor-time only: never stamp arbitrary objects. A stamped non-instance would
* satisfy `instanceof` while lacking the prototype members (getters like `.status`)
* that callers reach for after the check.
*/
function stampErrorBrands(instance, ctor) {
	const brands = /* @__PURE__ */ new Set();
	let current = ctor;
	while (typeof current === "function") {
		const brand = current.mcpBrand;
		if (Object.prototype.hasOwnProperty.call(current, "mcpBrand") && typeof brand === "string") brands.add(brand);
		current = Object.getPrototypeOf(current);
	}
	if (brands.size === 0) return;
	Object.defineProperty(instance, BRANDS, {
		value: brands,
		enumerable: false,
		configurable: true
	});
}
/**
* `Symbol.hasInstance` implementation for branded hierarchy roots. Matches when the
* value carries the **own** brand of the class being tested against (cross-bundle
* path), falling back to ordinary prototype-based `instanceof` otherwise.
*/
function brandedHasInstance(cls, value) {
	try {
		if (typeof value === "object" && value !== null && Object.prototype.hasOwnProperty.call(cls, "mcpBrand") && typeof cls.mcpBrand === "string" && Object.prototype.hasOwnProperty.call(value, BRANDS)) {
			const carried = value[BRANDS];
			if (carried && typeof carried.has === "function" && carried.has(cls.mcpBrand)) return true;
		}
	} catch {}
	return Function.prototype[Symbol.hasInstance].call(cls, value);
}
(class OAuthError extends Error {
	static {
		Object.defineProperty(this, "mcpBrand", { value: "mcp.OAuthError" });
	}
	static [Symbol.hasInstance](value) {
		return brandedHasInstance(this, value);
	}
	/**
	* Brand-based type guard: equivalent to `value instanceof this`, as an
	* explicit static predicate (the axios/AWS-SDK `isInstance` style). Reads
	* the caller's own brand via `this`, so every branded subclass gets a
	* correctly-scoped guard by inheritance. Must be invoked on the class —
	* in callback position write `v => SdkError.isInstance(v)`, not
	* `.filter(SdkError.isInstance)` (detached calls throw rather than
	* silently matching nothing).
	*/
	static isInstance(value) {
		if (typeof this !== "function") throw new TypeError("isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`");
		return brandedHasInstance(this, value);
	}
	constructor(code, message, errorUri) {
		super(message);
		this.code = code;
		this.errorUri = errorUri;
		this.name = "OAuthError";
		stampErrorBrands(this, new.target);
	}
	/**
	* Converts the error to a standard OAuth error response object.
	*/
	toResponseObject() {
		const response = {
			error: this.code,
			error_description: this.message
		};
		if (this.errorUri) response.error_uri = this.errorUri;
		return response;
	}
	/**
	* Creates an {@linkcode OAuthError} from an OAuth error response.
	*/
	static fromResponse(response) {
		return new OAuthError(response.error, response.error_description ?? response.error, response.error_uri);
	}
});
/**
* Error codes for SDK errors (local errors that never cross the wire).
* Unlike {@linkcode ProtocolErrorCode} which uses numeric JSON-RPC codes, `SdkErrorCode` uses
* descriptive string values for better developer experience.
*
* These errors are thrown locally by the SDK and are never serialized as
* JSON-RPC error responses.
*/
let SdkErrorCode = /* @__PURE__ */ function(SdkErrorCode$1) {
	/** Transport is not connected */
	SdkErrorCode$1["NotConnected"] = "NOT_CONNECTED";
	/** Transport is already connected */
	SdkErrorCode$1["AlreadyConnected"] = "ALREADY_CONNECTED";
	/** Protocol is not initialized */
	SdkErrorCode$1["NotInitialized"] = "NOT_INITIALIZED";
	/** Required capability is not supported by the remote side */
	SdkErrorCode$1["CapabilityNotSupported"] = "CAPABILITY_NOT_SUPPORTED";
	/** Request timed out waiting for response */
	SdkErrorCode$1["RequestTimeout"] = "REQUEST_TIMEOUT";
	/** Connection was closed */
	SdkErrorCode$1["ConnectionClosed"] = "CONNECTION_CLOSED";
	/** Failed to send message */
	SdkErrorCode$1["SendFailed"] = "SEND_FAILED";
	/** Response result failed local schema validation */
	SdkErrorCode$1["InvalidResult"] = "INVALID_RESULT";
	/**
	* The response carried a `resultType` discriminator (protocol revision
	* 2026-07-28) naming a result kind this client cannot consume yet, e.g.
	* `input_required`. The kind is carried in `data.resultType`.
	*/
	SdkErrorCode$1["UnsupportedResultType"] = "UNSUPPORTED_RESULT_TYPE";
	/**
	* The multi-round-trip auto-fulfilment driver exhausted its round cap
	* (`inputRequired.maxRounds`) without the server returning a complete
	* result. `data.rounds` carries the cap that was hit and
	* `data.lastResult` carries the last `input_required` payload received
	* (`{ inputRequests, requestState? }`), so callers can inspect or resume
	* the flow manually.
	*/
	SdkErrorCode$1["InputRequiredRoundsExceeded"] = "INPUT_REQUIRED_ROUNDS_EXCEEDED";
	/**
	* The auto-aggregating no-`cursor` `listTools()` / `listPrompts()` /
	* `listResources()` / `listResourceTemplates()` walk hit the
	* `ClientOptions.listMaxPages` cap without the server's pagination
	* converging. `data.method` carries the list verb and
	* `data.listMaxPages` the cap that was hit; raise the cap or fall back to
	* explicit per-page `{ cursor }` calls.
	*/
	SdkErrorCode$1["ListPaginationExceeded"] = "LIST_PAGINATION_EXCEEDED";
	/**
	* The spec method being sent does not exist on the negotiated protocol
	* version's wire era (e.g. `tasks/get` toward a 2026-07-28 peer, or
	* `server/discover` toward a 2025-era peer). Raised locally, before
	* anything reaches the transport. The method and era are carried in
	* `data.method` / `data.era`.
	*/
	SdkErrorCode$1["MethodNotSupportedByProtocolVersion"] = "METHOD_NOT_SUPPORTED_BY_PROTOCOL_VERSION";
	/**
	* Protocol-era negotiation at connect time failed without producing either a
	* usable modern (2026-07-28+) era or a definitive legacy fallback signal —
	* e.g. the negotiation mode forbids falling back (`pin`), the probe hit a
	* network failure, or the server answered the probe with a 5xx (a typed
	* connect error, never an era verdict).
	*
	* Negotiation-phase only: this code is never used once an era is
	* established. Auth walls never carry it: a 401/403 rejecting the probe
	* uses {@linkcode ClientHttpAuthentication} / {@linkcode ClientHttpForbidden}
	* instead, so era-recovery flows keyed on this code (e.g. cached-verdict
	* gateways) can never persist a verdict for an unauthorized exchange.
	*/
	SdkErrorCode$1["EraNegotiationFailed"] = "ERA_NEGOTIATION_FAILED";
	SdkErrorCode$1["ClientHttpNotImplemented"] = "CLIENT_HTTP_NOT_IMPLEMENTED";
	/**
	* HTTP 401 authentication failure: the transport's re-auth retry still got
	* 401 (`Server returned 401 after re-authentication`), or the version
	* negotiation probe was rejected 401 with no `authProvider` configured
	* (`Version negotiation failed: the server requires authorization (HTTP 401)`).
	* Carried on an {@linkcode SdkHttpError} with `status: 401`.
	*/
	SdkErrorCode$1["ClientHttpAuthentication"] = "CLIENT_HTTP_AUTHENTICATION";
	/**
	* HTTP 403 denial: the step-up re-authorization retry limit was reached,
	* or the version negotiation probe was rejected 403
	* (`Version negotiation failed: the server denied access (HTTP 403)`).
	* Carried on an {@linkcode SdkHttpError} with `status: 403`.
	*/
	SdkErrorCode$1["ClientHttpForbidden"] = "CLIENT_HTTP_FORBIDDEN";
	SdkErrorCode$1["ClientHttpUnexpectedContent"] = "CLIENT_HTTP_UNEXPECTED_CONTENT";
	SdkErrorCode$1["ClientHttpFailedToOpenStream"] = "CLIENT_HTTP_FAILED_TO_OPEN_STREAM";
	SdkErrorCode$1["ClientHttpFailedToTerminateSession"] = "CLIENT_HTTP_FAILED_TO_TERMINATE_SESSION";
	return SdkErrorCode$1;
}({});
/**
* SDK errors are local errors that never cross the wire.
* They are distinct from {@linkcode ProtocolError} which represents JSON-RPC protocol errors
* that are serialized and sent as error responses.
*
* @example
* ```ts source="./sdkErrors.examples.ts#SdkError_basicUsage"
* try {
*     // Throwing an SDK error
*     throw new SdkError(SdkErrorCode.NotConnected, 'Transport is not connected');
* } catch (error) {
*     // Checking error type by code
*     if (error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout) {
*         // Handle timeout
*     }
* }
* ```
*/
var SdkError = class extends Error {
	static {
		Object.defineProperty(this, "mcpBrand", { value: "mcp.SdkError" });
	}
	static [Symbol.hasInstance](value) {
		return brandedHasInstance(this, value);
	}
	/**
	* Brand-based type guard: equivalent to `value instanceof this`, as an
	* explicit static predicate (the axios/AWS-SDK `isInstance` style). Reads
	* the caller's own brand via `this`, so every branded subclass gets a
	* correctly-scoped guard by inheritance. Must be invoked on the class —
	* in callback position write `v => SdkError.isInstance(v)`, not
	* `.filter(SdkError.isInstance)` (detached calls throw rather than
	* silently matching nothing).
	*/
	static isInstance(value) {
		if (typeof this !== "function") throw new TypeError("isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`");
		return brandedHasInstance(this, value);
	}
	/**
	* @param code - Stable string code identifying the failure ({@linkcode SdkErrorCode}).
	* @param message - Human-readable description.
	* @param data - Optional structured payload (for example the HTTP status carried by
	* {@linkcode SdkHttpError}). Opaque to the SDK: a `cause` key inside `data` is not
	* promoted to `Error.cause`.
	* @param options - Standard `ErrorOptions`, forwarded to `Error`. Pass the underlying
	* failure as `{ cause }` so it is reachable through the `Error.cause` chain that
	* loggers and error trackers walk.
	*/
	constructor(code, message, data, options) {
		super(message, options);
		this.code = code;
		this.data = data;
		this.name = "SdkError";
		stampErrorBrands(this, new.target);
	}
};
/**
* An {@linkcode SdkError} subclass for HTTP transport failures.
*
* Thrown by the streamable HTTP transport when the server responds with a
* non-OK status code. Narrows {@linkcode SdkError.data | data} to
* {@linkcode SdkHttpErrorData} so consumers can inspect the HTTP status
* without unsafe casting.
*
* @example
* ```ts source="./sdkErrors.examples.ts#SdkHttpError_basicUsage"
* if (error instanceof SdkHttpError) {
*     console.log(error.status); // number
*     console.log(error.statusText); // string | undefined
* }
* ```
*/
var SdkHttpError = class extends SdkError {
	static {
		Object.defineProperty(this, "mcpBrand", { value: "mcp.SdkHttpError" });
	}
	/**
	* @param options - Standard `ErrorOptions`, forwarded to `Error` (see {@linkcode SdkError}).
	*/
	constructor(code, message, data, options) {
		super(code, message, data, options);
		this.name = "SdkHttpError";
	}
	get status() {
		return this.data.status;
	}
	get statusText() {
		return this.data.statusText;
	}
};
function isPlainObject$7(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
/**
* Whether a required nested member counts as declared even though it is not
* spelled out: a bare `elicitation: {}` declaration (no mode sub-capability at
* all) is read as form support — the pre-mode (2025) meaning of a bare
* declaration — so an `elicitation.form` requirement treats it as satisfied.
* Declaring any mode explicitly (for example `elicitation: { url: {} }`)
* removes the implication.
*/
function isImpliedCapabilityMember(capability, member, declaredValue) {
	return capability === "elicitation" && member === "form" && declaredValue["form"] === void 0 && declaredValue["url"] === void 0;
}
/**
* The client capabilities an embedded multi-round-trip input request requires
* (call site 2 — the outbound input-request leg): a server MUST NOT send an
* `inputRequests` kind the request's declared client capabilities do not
* cover. Returns `undefined` for entries whose method is not one of the
* embedded input-request kinds (those are a server bug handled separately,
* not a capability question).
*
* The requirement is mode-aware where the capability is: URL-mode elicitation
* requires `elicitation.url`; form-mode (or mode-omitted) elicitation requires
* `elicitation.form` (modes are sub-capabilities, and a server MUST NOT send a
* mode the client did not declare); sampling with `tools`/`toolChoice`
* requires `sampling.tools`. A bare `elicitation: {}` declaration satisfies
* the form requirement — see {@linkcode missingClientCapabilities}.
*/
function requiredClientCapabilitiesForInputRequest(entry) {
	switch (entry.method) {
		case "elicitation/create":
			if (entry.params?.["mode"] === "url") return { elicitation: { url: {} } };
			return { elicitation: { form: {} } };
		case "sampling/createMessage": {
			const params = entry.params;
			if (params !== void 0 && (params["tools"] !== void 0 || params["toolChoice"] !== void 0)) return { sampling: { tools: {} } };
			return { sampling: {} };
		}
		case "roots/list": return { roots: {} };
		default: return;
	}
}
/**
* Computes the subset of `required` client capabilities the client did not
* declare. Returns `undefined` when every required capability is declared;
* otherwise returns an object in the `ClientCapabilities` shape containing
* exactly the missing capabilities (suitable for
* `data.requiredCapabilities` on the `-32021` error).
*
* A capability counts as declared when its top-level key is present on the
* declared capabilities; when the requirement names nested members (for
* example `elicitation: { url: {} }`), each named member must also be present
* under the declared capability. One lenient reading applies: a bare
* `elicitation: {}` declaration (no mode sub-capability at all) counts as
* declaring `elicitation.form` — the pre-mode (2025) meaning of a bare
* declaration. An absent or empty `declared` value means
* nothing is declared — every required capability is missing (the structural
* clean-refusal posture for sessions with no per-request capability view).
*/
function missingClientCapabilities(required, declared) {
	const missing = {};
	for (const [capability, requirement] of Object.entries(required)) {
		if (requirement === void 0) continue;
		const declaredValue = declared === void 0 ? void 0 : declared[capability];
		if (declaredValue === void 0) {
			missing[capability] = requirement;
			continue;
		}
		if (isPlainObject$7(requirement) && isPlainObject$7(declaredValue)) {
			const missingMembers = {};
			for (const [member, memberRequirement] of Object.entries(requirement)) if (memberRequirement !== void 0 && declaredValue[member] === void 0 && !isImpliedCapabilityMember(capability, member, declaredValue)) missingMembers[member] = memberRequirement;
			if (Object.keys(missingMembers).length > 0) missing[capability] = missingMembers;
		}
	}
	return Object.keys(missing).length > 0 ? missing : void 0;
}
/**
* The first protocol revision of the modern (2026-07-28) era. Revision identifiers
* are ISO dates, so lexicographic comparison orders them chronologically.
*/
const FIRST_MODERN_PROTOCOL_VERSION = "2026-07-28";
/**
* Modern-era protocol revisions this SDK can negotiate via `server/discover`.
* Deliberately separate from {@linkcode SUPPORTED_PROTOCOL_VERSIONS} (the legacy
* `initialize` list), so adding a revision here can never leak a modern version
* string into a 2025-era handshake. Internal — not part of the public API surface.
*/
const SUPPORTED_MODERN_PROTOCOL_VERSIONS = [FIRST_MODERN_PROTOCOL_VERSION];
/** Whether the given protocol revision belongs to the modern (2026-07-28+) era. */
function isModernProtocolVersion(version) {
	return version >= FIRST_MODERN_PROTOCOL_VERSION;
}
/** The legacy-era (pre-2026-07-28) subset of a supported-versions list, in the list's own preference order. */
function legacyProtocolVersions(versions) {
	return versions.filter((version) => !isModernProtocolVersion(version));
}
/** The modern-era (2026-07-28+) subset of a supported-versions list, in the list's own preference order. */
function modernProtocolVersions(versions) {
	return versions.filter((version) => isModernProtocolVersion(version));
}
/**
* SEP-2106 §4.3 TextContent auto-append, era-agnostic, called from BOTH
* codecs' {@link WireCodec.projectCallToolResult}: when `structuredContent`
* is a non-object value (array/primitive/`null`) and the handler authored no
* `type:'text'` block, append `{type:'text', text: JSON.stringify(value)}`.
* Object-shaped (or absent) `structuredContent` returns the same reference.
*
* Leaf module: imported by both era codec modules, so it must NOT import from
* `./codec.js` (which value-imports the rev codecs at top level — that would
* make a runtime cycle and a TDZ hazard for entries that evaluate a rev codec
* module first).
*/
function appendTextFallbackForNonObject(result) {
	const sc = result.structuredContent;
	if (sc === void 0) return result;
	if (!(typeof sc !== "object" || sc === null || Array.isArray(sc))) return result;
	if (result.content?.some((c) => c.type === "text") ?? false) return result;
	return {
		...result,
		content: [...result.content ?? [], {
			type: "text",
			text: JSON.stringify(sc)
		}]
	};
}
/**
* Result-family keys that must never default into a `{content: []}` tools/call
* success. Shared by the 2025 wire-seam schema and server normalization.
* Leaf module (like `textFallback.ts`): imported by registry/server paths, so
* it must NOT import from `./codec.js` — that would close a runtime cycle.
*/
const TOOL_RESULT_FOREIGN_FAMILY_KEYS = [
	"task",
	"inputRequests",
	"requestState"
];
/**
* Single owner of the v1-parity ruling: a plain-object tool result without `content` (and
* without foreign-family keys) gains `content: []`. Shared by the 2025 wire seam and server-side handler normalization.
*/
function normalizeContentlessToolResult(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value) || value.content !== void 0 || TOOL_RESULT_FOREIGN_FAMILY_KEYS.some((key) => key in value)) return value;
	return {
		...value,
		content: []
	};
}
/**
* Complete frozen 2025-11-25 wire schemas. Self-contained — no imports from
* the public/neutral types/schemas.ts. The neutral layer is the public-API
* superset and is free to evolve (e.g., SEP-2106 widening); this file is the
* 2025 wire-parse contract (Q10-L2 byte-identity) and is BEHAVIOR-FROZEN.
*
* This is the era's complete frozen wire-parse contract — both the 2025-only
* delta (the deprecated task family, the era role unions) AND frozen copies of
* every era-shared shape (Tool, CallToolResult, Initialize*, ContentBlock,
* prompts/resources/completion/elicitation, …). The 2026-era codec
* (`wire/rev2026-07-28/`) is symmetrically self-contained in the same way.
*
* The 2025-only delta (the task message surface, restored types-only by #2248
* for interop with task-capable 2025 peers) is parsed ONLY through this era's
* registry; the deprecated Task* schemas also live (marked `@deprecated`) in
* the neutral schema layer so the public types stay nameable without a
* cross-layer import — nameability is constant, runtime availability is
* version-keyed — but appear in no API signature. Q1 increment 2 — deletions
* are physical: the
* 2026-era REGISTRY has no Task* methods (its frozen building-block copies do
* carry the deprecated Task* sub-schemas by composition — soft contamination,
* tracked for anchor-exactness adjudication).
*
* The only cross-layer dependency is `import type { JSONObject, JSONValue }`
* from the neutral types barrel — pure structural type aliases with no parse
* behavior. No runtime schema is shared with the neutral layer.
*/
function build$1() {
	const JSONValueSchema$1 = lazy(() => union([
		string(),
		number$1(),
		boolean(),
		_null(),
		record(string(), JSONValueSchema$1),
		array(JSONValueSchema$1)
	]));
	const JSONObjectSchema$1 = record(string(), JSONValueSchema$1);
	/**
	* A progress token, used to associate progress notifications with the original request.
	*/
	const ProgressTokenSchema$1 = union([string(), number$1().int()]);
	/**
	* An opaque token used to represent a cursor for pagination.
	*/
	const CursorSchema$1 = string();
	/** @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only. */
	const TaskMetadataSchema$1 = object({ ttl: number$1().optional() });
	/**
	* Metadata for associating messages with a task.
	* Include this in the `_meta` field under the key `io.modelcontextprotocol/related-task`.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const RelatedTaskMetadataSchema$1 = object({ taskId: string() });
	const RequestMetaSchema$1 = looseObject({
		progressToken: ProgressTokenSchema$1.optional(),
		"io.modelcontextprotocol/related-task": RelatedTaskMetadataSchema$1.optional()
	});
	/**
	* Common params for any request.
	*/
	const BaseRequestParamsSchema$1 = object({ _meta: RequestMetaSchema$1.optional() });
	/**
	* Common params for any task-augmented request.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const TaskAugmentedRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({ task: TaskMetadataSchema$1.optional() });
	const RequestSchema$1 = object({
		method: string(),
		params: BaseRequestParamsSchema$1.loose().optional()
	});
	const NotificationsParamsSchema$1 = object({ _meta: RequestMetaSchema$1.optional() });
	const NotificationSchema$1 = object({
		method: string(),
		params: NotificationsParamsSchema$1.loose().optional()
	});
	const ResultSchema$1 = looseObject({ _meta: RequestMetaSchema$1.optional() });
	/**
	* A uniquely identifying ID for a request in JSON-RPC.
	*/
	const RequestIdSchema$1 = union([string(), number$1().int()]);
	/**
	* A response that indicates success but carries no data.
	*/
	const EmptyResultSchema$1 = ResultSchema$1.strict();
	const CancelledNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({
		requestId: RequestIdSchema$1.optional(),
		reason: string().optional()
	});
	/**
	* This notification can be sent by either side to indicate that it is cancelling a previously-issued request.
	*
	* The request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.
	*
	* This notification indicates that the result will be unused, so any associated processing SHOULD cease.
	*
	* A client MUST NOT attempt to cancel its {@linkcode InitializeRequest | initialize} request.
	*/
	const CancelledNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/cancelled"),
		params: CancelledNotificationParamsSchema$1
	});
	/**
	* Icon schema for use in {@link Tool | tools}, {@link Prompt | prompts}, {@link Resource | resources}, and {@link Implementation | implementations}.
	*/
	const IconSchema$1 = object({
		src: string(),
		mimeType: string().optional(),
		sizes: array(string()).optional(),
		theme: _enum(["light", "dark"]).optional()
	});
	/**
	* Base schema to add `icons` property.
	*
	*/
	const IconsSchema$1 = object({ icons: array(IconSchema$1).optional() });
	/**
	* Base metadata interface for common properties across {@link Resource | resources}, {@link Tool | tools}, {@link Prompt | prompts}, and {@link Implementation | implementations}.
	*/
	const BaseMetadataSchema$1 = object({
		name: string(),
		title: string().optional()
	});
	/**
	* Describes the name and version of an MCP implementation.
	*/
	const ImplementationSchema$1 = BaseMetadataSchema$1.extend({
		...BaseMetadataSchema$1.shape,
		...IconsSchema$1.shape,
		version: string(),
		websiteUrl: string().optional(),
		description: string().optional()
	});
	const ElicitationCapabilitySchema = preprocess((value) => {
		if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return { form: {} };
		return value;
	}, intersection(object({
		form: intersection(object({ applyDefaults: boolean().optional() }), JSONObjectSchema$1).optional(),
		url: JSONObjectSchema$1.optional()
	}), JSONObjectSchema$1.optional()));
	/**
	* Task capabilities for clients, indicating which request types support task creation.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const ClientTasksCapabilitySchema$1 = looseObject({
		list: JSONObjectSchema$1.optional(),
		cancel: JSONObjectSchema$1.optional(),
		requests: looseObject({
			sampling: looseObject({ createMessage: JSONObjectSchema$1.optional() }).optional(),
			elicitation: looseObject({ create: JSONObjectSchema$1.optional() }).optional()
		}).optional()
	});
	/**
	* Task capabilities for servers, indicating which request types support task creation.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const ServerTasksCapabilitySchema$1 = looseObject({
		list: JSONObjectSchema$1.optional(),
		cancel: JSONObjectSchema$1.optional(),
		requests: looseObject({ tools: looseObject({ call: JSONObjectSchema$1.optional() }).optional() }).optional()
	});
	/**
	* Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.
	*/
	const ClientCapabilitiesSchema$1 = object({
		experimental: record(string(), JSONObjectSchema$1).optional(),
		sampling: object({
			context: JSONObjectSchema$1.optional(),
			tools: JSONObjectSchema$1.optional()
		}).optional(),
		elicitation: ElicitationCapabilitySchema.optional(),
		roots: object({ listChanged: boolean().optional() }).optional(),
		tasks: ClientTasksCapabilitySchema$1.optional(),
		extensions: record(string(), JSONObjectSchema$1).optional()
	});
	const InitializeRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({
		protocolVersion: string(),
		capabilities: ClientCapabilitiesSchema$1,
		clientInfo: ImplementationSchema$1
	});
	/**
	* This request is sent from the client to the server when it first connects, asking it to begin initialization.
	*/
	const InitializeRequestSchema$1 = RequestSchema$1.extend({
		method: literal("initialize"),
		params: InitializeRequestParamsSchema$1
	});
	/**
	* Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.
	*/
	const ServerCapabilitiesSchema$1 = object({
		experimental: record(string(), JSONObjectSchema$1).optional(),
		logging: JSONObjectSchema$1.optional(),
		completions: JSONObjectSchema$1.optional(),
		prompts: object({ listChanged: boolean().optional() }).optional(),
		resources: object({
			subscribe: boolean().optional(),
			listChanged: boolean().optional()
		}).optional(),
		tools: object({ listChanged: boolean().optional() }).optional(),
		tasks: ServerTasksCapabilitySchema$1.optional(),
		extensions: record(string(), JSONObjectSchema$1).optional()
	});
	/**
	* After receiving an initialize request from the client, the server sends this response.
	*/
	const InitializeResultSchema$1 = ResultSchema$1.extend({
		protocolVersion: string(),
		capabilities: ServerCapabilitiesSchema$1,
		serverInfo: ImplementationSchema$1,
		instructions: string().optional()
	});
	/**
	* This notification is sent from the client to the server after initialization has finished.
	*/
	const InitializedNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/initialized"),
		params: NotificationsParamsSchema$1.optional()
	});
	/**
	* A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.
	*/
	const PingRequestSchema$1 = RequestSchema$1.extend({
		method: literal("ping"),
		params: BaseRequestParamsSchema$1.optional()
	});
	const ProgressSchema$1 = object({
		progress: number$1(),
		total: optional(number$1()),
		message: optional(string())
	});
	const ProgressNotificationParamsSchema$1 = object({
		...NotificationsParamsSchema$1.shape,
		...ProgressSchema$1.shape,
		progressToken: ProgressTokenSchema$1
	});
	/**
	* An out-of-band notification used to inform the receiver of a progress update for a long-running request.
	*
	* @category notifications/progress
	*/
	const ProgressNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/progress"),
		params: ProgressNotificationParamsSchema$1
	});
	const PaginatedRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({ cursor: CursorSchema$1.optional() });
	const PaginatedRequestSchema$1 = RequestSchema$1.extend({ params: PaginatedRequestParamsSchema$1.optional() });
	const PaginatedResultSchema$1 = ResultSchema$1.extend({ nextCursor: CursorSchema$1.optional() });
	/**
	* The contents of a specific resource or sub-resource.
	*/
	const ResourceContentsSchema$1 = object({
		uri: string(),
		mimeType: optional(string()),
		_meta: record(string(), unknown()).optional()
	});
	const TextResourceContentsSchema$1 = ResourceContentsSchema$1.extend({ text: string() });
	/**
	* A Zod schema for validating Base64 strings that is more performant and
	* robust for very large inputs than the default regex-based check. It avoids
	* stack overflows by using the native `atob` function for validation.
	*/
	const Base64Schema = string().refine((val) => {
		try {
			atob(val);
			return true;
		} catch {
			return false;
		}
	}, { message: "Invalid Base64 string" });
	const BlobResourceContentsSchema$1 = ResourceContentsSchema$1.extend({ blob: Base64Schema });
	/**
	* The sender or recipient of messages and data in a conversation.
	*/
	const RoleSchema$1 = _enum(["user", "assistant"]);
	/**
	* Optional annotations providing clients additional context about a resource.
	*/
	const AnnotationsSchema$1 = object({
		audience: array(RoleSchema$1).optional(),
		priority: number$1().min(0).max(1).optional(),
		lastModified: datetime({ offset: true }).optional()
	});
	/**
	* A known resource that the server is capable of reading.
	*/
	const ResourceSchema$1 = object({
		...BaseMetadataSchema$1.shape,
		...IconsSchema$1.shape,
		uri: string(),
		description: optional(string()),
		mimeType: optional(string()),
		size: optional(number$1()),
		annotations: AnnotationsSchema$1.optional(),
		_meta: optional(looseObject({}))
	});
	/**
	* A template description for resources available on the server.
	*/
	const ResourceTemplateSchema$1 = object({
		...BaseMetadataSchema$1.shape,
		...IconsSchema$1.shape,
		uriTemplate: string(),
		description: optional(string()),
		mimeType: optional(string()),
		annotations: AnnotationsSchema$1.optional(),
		_meta: optional(looseObject({}))
	});
	/**
	* Sent from the client to request a list of resources the server has.
	*/
	const ListResourcesRequestSchema$1 = PaginatedRequestSchema$1.extend({ method: literal("resources/list") });
	/**
	* The server's response to a {@linkcode ListResourcesRequest | resources/list} request from the client.
	*/
	const ListResourcesResultSchema$1 = PaginatedResultSchema$1.extend({ resources: array(ResourceSchema$1) });
	/**
	* Sent from the client to request a list of resource templates the server has.
	*/
	const ListResourceTemplatesRequestSchema$1 = PaginatedRequestSchema$1.extend({ method: literal("resources/templates/list") });
	/**
	* The server's response to a {@linkcode ListResourceTemplatesRequest | resources/templates/list} request from the client.
	*/
	const ListResourceTemplatesResultSchema$1 = PaginatedResultSchema$1.extend({ resourceTemplates: array(ResourceTemplateSchema$1) });
	const ResourceRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({ uri: string() });
	/**
	* Parameters for a {@linkcode ReadResourceRequest | resources/read} request.
	*/
	const ReadResourceRequestParamsSchema$1 = ResourceRequestParamsSchema$1;
	/**
	* Sent from the client to the server, to read a specific resource URI.
	*/
	const ReadResourceRequestSchema$1 = RequestSchema$1.extend({
		method: literal("resources/read"),
		params: ReadResourceRequestParamsSchema$1
	});
	/**
	* The server's response to a {@linkcode ReadResourceRequest | resources/read} request from the client.
	*/
	const ReadResourceResultSchema$1 = ResultSchema$1.extend({ contents: array(union([TextResourceContentsSchema$1, BlobResourceContentsSchema$1])) });
	/**
	* An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.
	*/
	const ResourceListChangedNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/resources/list_changed"),
		params: NotificationsParamsSchema$1.optional()
	});
	const SubscribeRequestParamsSchema$1 = ResourceRequestParamsSchema$1;
	/**
	* Sent from the client to request `resources/updated` notifications from the server whenever a particular resource changes.
	*/
	const SubscribeRequestSchema$1 = RequestSchema$1.extend({
		method: literal("resources/subscribe"),
		params: SubscribeRequestParamsSchema$1
	});
	const UnsubscribeRequestParamsSchema$1 = ResourceRequestParamsSchema$1;
	/**
	* Sent from the client to request cancellation of {@linkcode ResourceUpdatedNotification | resources/updated} notifications from the server. This should follow a previous {@linkcode SubscribeRequest | resources/subscribe} request.
	*/
	const UnsubscribeRequestSchema$1 = RequestSchema$1.extend({
		method: literal("resources/unsubscribe"),
		params: UnsubscribeRequestParamsSchema$1
	});
	/**
	* Parameters for a {@linkcode ResourceUpdatedNotification | notifications/resources/updated} notification.
	*/
	const ResourceUpdatedNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({ uri: string() });
	/**
	* A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a {@linkcode SubscribeRequest | resources/subscribe} request.
	*/
	const ResourceUpdatedNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/resources/updated"),
		params: ResourceUpdatedNotificationParamsSchema$1
	});
	/**
	* Describes an argument that a prompt can accept.
	*/
	const PromptArgumentSchema$1 = object({
		name: string(),
		description: optional(string()),
		required: optional(boolean())
	});
	/**
	* A prompt or prompt template that the server offers.
	*/
	const PromptSchema$1 = object({
		...BaseMetadataSchema$1.shape,
		...IconsSchema$1.shape,
		description: optional(string()),
		arguments: optional(array(PromptArgumentSchema$1)),
		_meta: optional(looseObject({}))
	});
	/**
	* Sent from the client to request a list of prompts and prompt templates the server has.
	*/
	const ListPromptsRequestSchema$1 = PaginatedRequestSchema$1.extend({ method: literal("prompts/list") });
	/**
	* The server's response to a {@linkcode ListPromptsRequest | prompts/list} request from the client.
	*/
	const ListPromptsResultSchema$1 = PaginatedResultSchema$1.extend({ prompts: array(PromptSchema$1) });
	/**
	* Parameters for a {@linkcode GetPromptRequest | prompts/get} request.
	*/
	const GetPromptRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({
		name: string(),
		arguments: record(string(), string()).optional()
	});
	/**
	* Used by the client to get a prompt provided by the server.
	*/
	const GetPromptRequestSchema$1 = RequestSchema$1.extend({
		method: literal("prompts/get"),
		params: GetPromptRequestParamsSchema$1
	});
	/**
	* Text provided to or from an LLM.
	*/
	const TextContentSchema$1 = object({
		type: literal("text"),
		text: string(),
		annotations: AnnotationsSchema$1.optional(),
		_meta: record(string(), unknown()).optional()
	});
	/**
	* An image provided to or from an LLM.
	*/
	const ImageContentSchema$1 = object({
		type: literal("image"),
		data: Base64Schema,
		mimeType: string(),
		annotations: AnnotationsSchema$1.optional(),
		_meta: record(string(), unknown()).optional()
	});
	/**
	* Audio content provided to or from an LLM.
	*/
	const AudioContentSchema$1 = object({
		type: literal("audio"),
		data: Base64Schema,
		mimeType: string(),
		annotations: AnnotationsSchema$1.optional(),
		_meta: record(string(), unknown()).optional()
	});
	/**
	* A tool call request from an assistant (LLM).
	* Represents the assistant's request to use a tool.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const ToolUseContentSchema$1 = object({
		type: literal("tool_use"),
		name: string(),
		id: string(),
		input: record(string(), unknown()),
		_meta: record(string(), unknown()).optional()
	});
	/**
	* The contents of a resource, embedded into a prompt or tool call result.
	*/
	const EmbeddedResourceSchema$1 = object({
		type: literal("resource"),
		resource: union([TextResourceContentsSchema$1, BlobResourceContentsSchema$1]),
		annotations: AnnotationsSchema$1.optional(),
		_meta: record(string(), unknown()).optional()
	});
	/**
	* A resource that the server is capable of reading, included in a prompt or tool call result.
	*
	* Note: resource links returned by tools are not guaranteed to appear in the results of {@linkcode ListResourcesRequest | resources/list} requests.
	*/
	const ResourceLinkSchema$1 = ResourceSchema$1.extend({ type: literal("resource_link") });
	/**
	* A content block that can be used in prompts and tool results.
	*/
	const ContentBlockSchema$1 = union([
		TextContentSchema$1,
		ImageContentSchema$1,
		AudioContentSchema$1,
		ResourceLinkSchema$1,
		EmbeddedResourceSchema$1
	]);
	/**
	* Describes a message returned as part of a prompt.
	*/
	const PromptMessageSchema$1 = object({
		role: RoleSchema$1,
		content: ContentBlockSchema$1
	});
	/**
	* The server's response to a {@linkcode GetPromptRequest | prompts/get} request from the client.
	*/
	const GetPromptResultSchema$1 = ResultSchema$1.extend({
		description: string().optional(),
		messages: array(PromptMessageSchema$1)
	});
	/**
	* An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This may be issued by servers without any previous subscription from the client.
	*/
	const PromptListChangedNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/prompts/list_changed"),
		params: NotificationsParamsSchema$1.optional()
	});
	/**
	* Additional properties describing a `Tool` to clients.
	*
	* NOTE: all properties in {@linkcode ToolAnnotations} are **hints**.
	* They are not guaranteed to provide a faithful description of
	* tool behavior (including descriptive properties like `title`).
	*
	* Clients should never make tool use decisions based on `ToolAnnotations`
	* received from untrusted servers.
	*/
	const ToolAnnotationsSchema$1 = object({
		title: string().optional(),
		readOnlyHint: boolean().optional(),
		destructiveHint: boolean().optional(),
		idempotentHint: boolean().optional(),
		openWorldHint: boolean().optional()
	});
	/**
	* Execution-related properties for a tool.
	*/
	const ToolExecutionSchema$1 = object({ taskSupport: _enum([
		"required",
		"optional",
		"forbidden"
	]).optional() });
	/**
	* Definition for a tool the client can call.
	*/
	const ToolSchema$1 = object({
		...BaseMetadataSchema$1.shape,
		...IconsSchema$1.shape,
		description: string().optional(),
		inputSchema: object({
			type: literal("object"),
			properties: record(string(), JSONValueSchema$1).optional(),
			required: array(string()).optional()
		}).catchall(unknown()),
		outputSchema: object({
			type: literal("object"),
			properties: record(string(), JSONValueSchema$1).optional(),
			required: array(string()).optional()
		}).catchall(unknown()).optional(),
		annotations: ToolAnnotationsSchema$1.optional(),
		execution: ToolExecutionSchema$1.optional(),
		_meta: record(string(), unknown()).optional()
	});
	/**
	* Sent from the client to request a list of tools the server has.
	*/
	const ListToolsRequestSchema$1 = PaginatedRequestSchema$1.extend({ method: literal("tools/list") });
	/**
	* The server's response to a {@linkcode ListToolsRequest | tools/list} request from the client.
	*/
	const ListToolsResultSchema$1 = PaginatedResultSchema$1.extend({ tools: array(ToolSchema$1) });
	/**
	* The server's response to a tool call.
	*/
	const CallToolResultSchema$1 = ResultSchema$1.extend({
		content: array(ContentBlockSchema$1),
		structuredContent: record(string(), unknown()).optional(),
		isError: boolean().optional()
	});
	/**
	* Parameters for a `tools/call` request.
	*/
	const CallToolRequestParamsSchema$1 = TaskAugmentedRequestParamsSchema$1.extend({
		name: string(),
		arguments: record(string(), unknown()).optional()
	});
	/**
	* Used by the client to invoke a tool provided by the server.
	*/
	const CallToolRequestSchema$1 = RequestSchema$1.extend({
		method: literal("tools/call"),
		params: CallToolRequestParamsSchema$1
	});
	/**
	* An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.
	*/
	const ToolListChangedNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/tools/list_changed"),
		params: NotificationsParamsSchema$1.optional()
	});
	/**
	* The severity of a log message.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to stderr logging
	* (STDIO servers) or OpenTelemetry.
	*/
	const LoggingLevelSchema$1 = _enum([
		"debug",
		"info",
		"notice",
		"warning",
		"error",
		"critical",
		"alert",
		"emergency"
	]);
	/**
	* Parameters for a `logging/setLevel` request.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to stderr logging
	* (STDIO servers) or OpenTelemetry.
	*/
	const SetLevelRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({ level: LoggingLevelSchema$1 });
	/**
	* A request from the client to the server, to enable or adjust logging.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to stderr logging
	* (STDIO servers) or OpenTelemetry.
	*/
	const SetLevelRequestSchema$1 = RequestSchema$1.extend({
		method: literal("logging/setLevel"),
		params: SetLevelRequestParamsSchema$1
	});
	/**
	* Parameters for a `notifications/message` notification.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to stderr logging
	* (STDIO servers) or OpenTelemetry.
	*/
	const LoggingMessageNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({
		level: LoggingLevelSchema$1,
		logger: string().optional(),
		data: unknown()
	});
	/**
	* Notification of a log message passed from server to client. If no `logging/setLevel` request has been sent from the client, the server MAY decide which messages to send automatically.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to stderr logging
	* (STDIO servers) or OpenTelemetry.
	*/
	const LoggingMessageNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/message"),
		params: LoggingMessageNotificationParamsSchema$1
	});
	/**
	* Hints to use for model selection.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const ModelHintSchema$1 = object({ name: string().optional() });
	/**
	* The server's preferences for model selection, requested of the client during sampling.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const ModelPreferencesSchema$1 = object({
		hints: array(ModelHintSchema$1).optional(),
		costPriority: number$1().min(0).max(1).optional(),
		speedPriority: number$1().min(0).max(1).optional(),
		intelligencePriority: number$1().min(0).max(1).optional()
	});
	/**
	* Controls tool usage behavior in sampling requests.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const ToolChoiceSchema$1 = object({ mode: _enum([
		"auto",
		"required",
		"none"
	]).optional() });
	/**
	* The result of a tool execution, provided by the user (server).
	* Represents the outcome of invoking a tool requested via `ToolUseContent`.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const ToolResultContentSchema$1 = object({
		type: literal("tool_result"),
		toolUseId: string().describe("The unique identifier for the corresponding tool call."),
		content: array(ContentBlockSchema$1),
		structuredContent: object({}).loose().optional(),
		isError: boolean().optional(),
		_meta: record(string(), unknown()).optional()
	});
	/**
	* Basic content types for sampling responses (without tool use).
	* Used for backwards-compatible {@linkcode CreateMessageResult} when tools are not used.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const SamplingContentSchema$1 = discriminatedUnion("type", [
		TextContentSchema$1,
		ImageContentSchema$1,
		AudioContentSchema$1
	]);
	/**
	* Content block types allowed in sampling messages.
	* This includes text, image, audio, tool use requests, and tool results.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const SamplingMessageContentBlockSchema$1 = discriminatedUnion("type", [
		TextContentSchema$1,
		ImageContentSchema$1,
		AudioContentSchema$1,
		ToolUseContentSchema$1,
		ToolResultContentSchema$1
	]);
	/**
	* Describes a message issued to or received from an LLM API.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const SamplingMessageSchema$1 = object({
		role: RoleSchema$1,
		content: union([SamplingMessageContentBlockSchema$1, array(SamplingMessageContentBlockSchema$1)]),
		_meta: record(string(), unknown()).optional()
	});
	/**
	* Parameters for a `sampling/createMessage` request.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const CreateMessageRequestParamsSchema$1 = TaskAugmentedRequestParamsSchema$1.extend({
		messages: array(SamplingMessageSchema$1),
		modelPreferences: ModelPreferencesSchema$1.optional(),
		systemPrompt: string().optional(),
		includeContext: _enum([
			"none",
			"thisServer",
			"allServers"
		]).optional(),
		temperature: number$1().optional(),
		maxTokens: number$1().int(),
		stopSequences: array(string()).optional(),
		metadata: JSONObjectSchema$1.optional(),
		tools: array(ToolSchema$1).optional(),
		toolChoice: ToolChoiceSchema$1.optional()
	});
	/**
	* A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const CreateMessageRequestSchema$1 = RequestSchema$1.extend({
		method: literal("sampling/createMessage"),
		params: CreateMessageRequestParamsSchema$1
	});
	/**
	* The client's response to a `sampling/create_message` request from the server.
	* This is the backwards-compatible version that returns single content (no arrays).
	* Used when the request does not include tools.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const CreateMessageResultSchema$1 = ResultSchema$1.extend({
		model: string(),
		stopReason: optional(_enum([
			"endTurn",
			"stopSequence",
			"maxTokens"
		]).or(string())),
		role: RoleSchema$1,
		content: SamplingContentSchema$1
	});
	/**
	* The client's response to a `sampling/create_message` request when tools were provided.
	* This version supports array content for tool use flows.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to calling LLM
	* provider APIs directly.
	*/
	const CreateMessageResultWithToolsSchema$1 = ResultSchema$1.extend({
		model: string(),
		stopReason: optional(_enum([
			"endTurn",
			"stopSequence",
			"maxTokens",
			"toolUse"
		]).or(string())),
		role: RoleSchema$1,
		content: union([SamplingMessageContentBlockSchema$1, array(SamplingMessageContentBlockSchema$1)])
	});
	/**
	* Primitive schema definition for boolean fields.
	*/
	const BooleanSchemaSchema$1 = object({
		type: literal("boolean"),
		title: string().optional(),
		description: string().optional(),
		default: boolean().optional()
	});
	/**
	* Primitive schema definition for string fields.
	*/
	const StringSchemaSchema$1 = object({
		type: literal("string"),
		title: string().optional(),
		description: string().optional(),
		minLength: number$1().optional(),
		maxLength: number$1().optional(),
		format: _enum([
			"email",
			"uri",
			"date",
			"date-time"
		]).optional(),
		default: string().optional()
	});
	/**
	* Primitive schema definition for number fields.
	*/
	const NumberSchemaSchema$1 = object({
		type: _enum(["number", "integer"]),
		title: string().optional(),
		description: string().optional(),
		minimum: number$1().optional(),
		maximum: number$1().optional(),
		default: number$1().optional()
	});
	/**
	* Schema for single-selection enumeration without display titles for options.
	*/
	const UntitledSingleSelectEnumSchemaSchema$1 = object({
		type: literal("string"),
		title: string().optional(),
		description: string().optional(),
		enum: array(string()),
		default: string().optional()
	});
	/**
	* Schema for single-selection enumeration with display titles for each option.
	*/
	const TitledSingleSelectEnumSchemaSchema$1 = object({
		type: literal("string"),
		title: string().optional(),
		description: string().optional(),
		oneOf: array(object({
			const: string(),
			title: string()
		})),
		default: string().optional()
	});
	/**
	* Use {@linkcode TitledSingleSelectEnumSchema} instead.
	* This interface will be removed in a future version.
	*/
	const LegacyTitledEnumSchemaSchema$1 = object({
		type: literal("string"),
		title: string().optional(),
		description: string().optional(),
		enum: array(string()),
		enumNames: array(string()).optional(),
		default: string().optional()
	});
	const SingleSelectEnumSchemaSchema$1 = union([UntitledSingleSelectEnumSchemaSchema$1, TitledSingleSelectEnumSchemaSchema$1]);
	/**
	* Schema for multiple-selection enumeration without display titles for options.
	*/
	const UntitledMultiSelectEnumSchemaSchema$1 = object({
		type: literal("array"),
		title: string().optional(),
		description: string().optional(),
		minItems: number$1().optional(),
		maxItems: number$1().optional(),
		items: object({
			type: literal("string"),
			enum: array(string())
		}),
		default: array(string()).optional()
	});
	/**
	* Schema for multiple-selection enumeration with display titles for each option.
	*/
	const TitledMultiSelectEnumSchemaSchema$1 = object({
		type: literal("array"),
		title: string().optional(),
		description: string().optional(),
		minItems: number$1().optional(),
		maxItems: number$1().optional(),
		items: object({ anyOf: array(object({
			const: string(),
			title: string()
		})) }),
		default: array(string()).optional()
	});
	/**
	* Combined schema for multiple-selection enumeration
	*/
	const MultiSelectEnumSchemaSchema$1 = union([UntitledMultiSelectEnumSchemaSchema$1, TitledMultiSelectEnumSchemaSchema$1]);
	/**
	* Primitive schema definition for enum fields.
	*/
	const EnumSchemaSchema$1 = union([
		LegacyTitledEnumSchemaSchema$1,
		SingleSelectEnumSchemaSchema$1,
		MultiSelectEnumSchemaSchema$1
	]);
	/**
	* Union of all primitive schema definitions.
	*/
	const PrimitiveSchemaDefinitionSchema$1 = union([
		EnumSchemaSchema$1,
		BooleanSchemaSchema$1,
		StringSchemaSchema$1,
		NumberSchemaSchema$1
	]);
	/**
	* Parameters for an `elicitation/create` request for form-based elicitation.
	*/
	const ElicitRequestFormParamsSchema$1 = TaskAugmentedRequestParamsSchema$1.extend({
		mode: literal("form").optional(),
		message: string(),
		requestedSchema: object({
			type: literal("object"),
			properties: record(string(), PrimitiveSchemaDefinitionSchema$1),
			required: array(string()).optional()
		}).catchall(unknown())
	});
	/**
	* Parameters for an {@linkcode ElicitRequest | elicitation/create} request for URL-based elicitation.
	*/
	const ElicitRequestURLParamsSchema$1 = TaskAugmentedRequestParamsSchema$1.extend({
		mode: literal("url"),
		message: string(),
		elicitationId: string(),
		url: string().url()
	});
	/**
	* The parameters for a request to elicit additional information from the user via the client.
	*/
	const ElicitRequestParamsSchema$1 = union([ElicitRequestFormParamsSchema$1, ElicitRequestURLParamsSchema$1]);
	/**
	* A request from the server to elicit user input via the client.
	* The client should present the message and form fields to the user (form mode)
	* or navigate to a URL (URL mode).
	*/
	const ElicitRequestSchema$1 = RequestSchema$1.extend({
		method: literal("elicitation/create"),
		params: ElicitRequestParamsSchema$1
	});
	/**
	* Parameters for a {@linkcode ElicitationCompleteNotification | notifications/elicitation/complete} notification.
	*
	* @category notifications/elicitation/complete
	*/
	const ElicitationCompleteNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({ elicitationId: string() });
	/**
	* A notification from the server to the client, informing it of a completion of an out-of-band elicitation request.
	*
	* @category notifications/elicitation/complete
	*/
	const ElicitationCompleteNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/elicitation/complete"),
		params: ElicitationCompleteNotificationParamsSchema$1
	});
	/**
	* The client's response to an {@linkcode ElicitRequest | elicitation/create} request from the server.
	*/
	const ElicitResultSchema$1 = ResultSchema$1.extend({
		action: _enum([
			"accept",
			"decline",
			"cancel"
		]),
		content: preprocess((val) => val === null ? void 0 : val, record(string(), union([
			string(),
			number$1(),
			boolean(),
			array(string())
		])).optional())
	});
	/**
	* A reference to a resource or resource template definition.
	*/
	const ResourceTemplateReferenceSchema$1 = object({
		type: literal("ref/resource"),
		uri: string()
	});
	/**
	* Identifies a prompt.
	*/
	const PromptReferenceSchema$1 = object({
		type: literal("ref/prompt"),
		name: string()
	});
	/**
	* Parameters for a {@linkcode CompleteRequest | completion/complete} request.
	*/
	const CompleteRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({
		ref: union([PromptReferenceSchema$1, ResourceTemplateReferenceSchema$1]),
		argument: object({
			name: string(),
			value: string()
		}),
		context: object({ arguments: record(string(), string()).optional() }).optional()
	});
	/**
	* A request from the client to the server, to ask for completion options.
	*/
	const CompleteRequestSchema$1 = RequestSchema$1.extend({
		method: literal("completion/complete"),
		params: CompleteRequestParamsSchema$1
	});
	/**
	* The server's response to a {@linkcode CompleteRequest | completion/complete} request
	*/
	const CompleteResultSchema$1 = ResultSchema$1.extend({ completion: looseObject({
		values: array(string()).max(100),
		total: optional(number$1().int()),
		hasMore: optional(boolean())
	}) });
	/**
	* Represents a root directory or file that the server can operate on.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to passing paths via
	* tool parameters, resource URIs, or configuration.
	*/
	const RootSchema$1 = object({
		uri: string().startsWith("file://"),
		name: string().optional(),
		_meta: record(string(), unknown()).optional()
	});
	/**
	* Sent from the server to request a list of root URIs from the client.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to passing paths via
	* tool parameters, resource URIs, or configuration.
	*/
	const ListRootsRequestSchema$1 = RequestSchema$1.extend({
		method: literal("roots/list"),
		params: BaseRequestParamsSchema$1.optional()
	});
	/**
	* The client's response to a `roots/list` request from the server.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to passing paths via
	* tool parameters, resource URIs, or configuration.
	*/
	const ListRootsResultSchema$1 = ResultSchema$1.extend({ roots: array(RootSchema$1) });
	/**
	* A notification from the client to the server, informing it that the list of roots has changed.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577); remains
	* in the specification for at least twelve months. Migrate to passing paths via
	* tool parameters, resource URIs, or configuration.
	*/
	const RootsListChangedNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/roots/list_changed"),
		params: NotificationsParamsSchema$1.optional()
	});
	/**
	* Task creation parameters, used to ask that the server create a task to represent a request.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const TaskCreationParamsSchema$1 = looseObject({
		ttl: number$1().optional(),
		pollInterval: number$1().optional()
	});
	/**
	* The status of a task.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const TaskStatusSchema$1 = _enum([
		"working",
		"input_required",
		"completed",
		"failed",
		"cancelled"
	]);
	/**
	* A pollable state object associated with a request.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const TaskSchema$1 = object({
		taskId: string(),
		status: TaskStatusSchema$1,
		ttl: union([number$1(), _null()]),
		createdAt: string(),
		lastUpdatedAt: string(),
		pollInterval: optional(number$1()),
		statusMessage: optional(string())
	});
	/**
	* Result returned when a task is created, containing the task data wrapped in a `task` field.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const CreateTaskResultSchema$1 = ResultSchema$1.extend({ task: TaskSchema$1 });
	/**
	* Parameters for task status notification.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const TaskStatusNotificationParamsSchema$1 = NotificationsParamsSchema$1.merge(TaskSchema$1);
	/**
	* A notification sent when a task's status changes.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const TaskStatusNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/tasks/status"),
		params: TaskStatusNotificationParamsSchema$1
	});
	/**
	* A request to get the state of a specific task.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const GetTaskRequestSchema$1 = RequestSchema$1.extend({
		method: literal("tasks/get"),
		params: BaseRequestParamsSchema$1.extend({ taskId: string() })
	});
	/**
	* The response to a {@linkcode GetTaskRequest | tasks/get} request.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const GetTaskResultSchema$1 = ResultSchema$1.merge(TaskSchema$1);
	/**
	* A request to get the result of a specific task.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const GetTaskPayloadRequestSchema$1 = RequestSchema$1.extend({
		method: literal("tasks/result"),
		params: BaseRequestParamsSchema$1.extend({ taskId: string() })
	});
	/**
	* The response to a `tasks/result` request.
	* The structure matches the result type of the original request.
	* For example, a {@linkcode CallToolRequest | tools/call} task would return the `CallToolResult` structure.
	*
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const GetTaskPayloadResultSchema$1 = ResultSchema$1.loose();
	/**
	* A request to list tasks.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const ListTasksRequestSchema$1 = PaginatedRequestSchema$1.extend({ method: literal("tasks/list") });
	/**
	* The response to a {@linkcode ListTasksRequest | tasks/list} request.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const ListTasksResultSchema$1 = PaginatedResultSchema$1.extend({ tasks: array(TaskSchema$1) });
	/**
	* A request to cancel a specific task.
	*
	* @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only.
	*/
	const CancelTaskRequestSchema$1 = RequestSchema$1.extend({
		method: literal("tasks/cancel"),
		params: BaseRequestParamsSchema$1.extend({ taskId: string() })
	});
	return {
		JSONValueSchema: JSONValueSchema$1,
		JSONObjectSchema: JSONObjectSchema$1,
		ProgressTokenSchema: ProgressTokenSchema$1,
		CursorSchema: CursorSchema$1,
		TaskMetadataSchema: TaskMetadataSchema$1,
		RelatedTaskMetadataSchema: RelatedTaskMetadataSchema$1,
		RequestMetaSchema: RequestMetaSchema$1,
		BaseRequestParamsSchema: BaseRequestParamsSchema$1,
		TaskAugmentedRequestParamsSchema: TaskAugmentedRequestParamsSchema$1,
		RequestSchema: RequestSchema$1,
		NotificationsParamsSchema: NotificationsParamsSchema$1,
		NotificationSchema: NotificationSchema$1,
		ResultSchema: ResultSchema$1,
		RequestIdSchema: RequestIdSchema$1,
		EmptyResultSchema: EmptyResultSchema$1,
		CancelledNotificationParamsSchema: CancelledNotificationParamsSchema$1,
		CancelledNotificationSchema: CancelledNotificationSchema$1,
		IconSchema: IconSchema$1,
		IconsSchema: IconsSchema$1,
		BaseMetadataSchema: BaseMetadataSchema$1,
		ImplementationSchema: ImplementationSchema$1,
		ClientTasksCapabilitySchema: ClientTasksCapabilitySchema$1,
		ServerTasksCapabilitySchema: ServerTasksCapabilitySchema$1,
		ClientCapabilitiesSchema: ClientCapabilitiesSchema$1,
		InitializeRequestParamsSchema: InitializeRequestParamsSchema$1,
		InitializeRequestSchema: InitializeRequestSchema$1,
		ServerCapabilitiesSchema: ServerCapabilitiesSchema$1,
		InitializeResultSchema: InitializeResultSchema$1,
		InitializedNotificationSchema: InitializedNotificationSchema$1,
		PingRequestSchema: PingRequestSchema$1,
		ProgressSchema: ProgressSchema$1,
		ProgressNotificationParamsSchema: ProgressNotificationParamsSchema$1,
		ProgressNotificationSchema: ProgressNotificationSchema$1,
		PaginatedRequestParamsSchema: PaginatedRequestParamsSchema$1,
		PaginatedRequestSchema: PaginatedRequestSchema$1,
		PaginatedResultSchema: PaginatedResultSchema$1,
		ResourceContentsSchema: ResourceContentsSchema$1,
		TextResourceContentsSchema: TextResourceContentsSchema$1,
		BlobResourceContentsSchema: BlobResourceContentsSchema$1,
		RoleSchema: RoleSchema$1,
		AnnotationsSchema: AnnotationsSchema$1,
		ResourceSchema: ResourceSchema$1,
		ResourceTemplateSchema: ResourceTemplateSchema$1,
		ListResourcesRequestSchema: ListResourcesRequestSchema$1,
		ListResourcesResultSchema: ListResourcesResultSchema$1,
		ListResourceTemplatesRequestSchema: ListResourceTemplatesRequestSchema$1,
		ListResourceTemplatesResultSchema: ListResourceTemplatesResultSchema$1,
		ResourceRequestParamsSchema: ResourceRequestParamsSchema$1,
		ReadResourceRequestParamsSchema: ReadResourceRequestParamsSchema$1,
		ReadResourceRequestSchema: ReadResourceRequestSchema$1,
		ReadResourceResultSchema: ReadResourceResultSchema$1,
		ResourceListChangedNotificationSchema: ResourceListChangedNotificationSchema$1,
		SubscribeRequestParamsSchema: SubscribeRequestParamsSchema$1,
		SubscribeRequestSchema: SubscribeRequestSchema$1,
		UnsubscribeRequestParamsSchema: UnsubscribeRequestParamsSchema$1,
		UnsubscribeRequestSchema: UnsubscribeRequestSchema$1,
		ResourceUpdatedNotificationParamsSchema: ResourceUpdatedNotificationParamsSchema$1,
		ResourceUpdatedNotificationSchema: ResourceUpdatedNotificationSchema$1,
		PromptArgumentSchema: PromptArgumentSchema$1,
		PromptSchema: PromptSchema$1,
		ListPromptsRequestSchema: ListPromptsRequestSchema$1,
		ListPromptsResultSchema: ListPromptsResultSchema$1,
		GetPromptRequestParamsSchema: GetPromptRequestParamsSchema$1,
		GetPromptRequestSchema: GetPromptRequestSchema$1,
		TextContentSchema: TextContentSchema$1,
		ImageContentSchema: ImageContentSchema$1,
		AudioContentSchema: AudioContentSchema$1,
		ToolUseContentSchema: ToolUseContentSchema$1,
		EmbeddedResourceSchema: EmbeddedResourceSchema$1,
		ResourceLinkSchema: ResourceLinkSchema$1,
		ContentBlockSchema: ContentBlockSchema$1,
		PromptMessageSchema: PromptMessageSchema$1,
		GetPromptResultSchema: GetPromptResultSchema$1,
		PromptListChangedNotificationSchema: PromptListChangedNotificationSchema$1,
		ToolAnnotationsSchema: ToolAnnotationsSchema$1,
		ToolExecutionSchema: ToolExecutionSchema$1,
		ToolSchema: ToolSchema$1,
		ListToolsRequestSchema: ListToolsRequestSchema$1,
		ListToolsResultSchema: ListToolsResultSchema$1,
		CallToolResultSchema: CallToolResultSchema$1,
		CallToolRequestParamsSchema: CallToolRequestParamsSchema$1,
		CallToolRequestSchema: CallToolRequestSchema$1,
		ToolListChangedNotificationSchema: ToolListChangedNotificationSchema$1,
		LoggingLevelSchema: LoggingLevelSchema$1,
		SetLevelRequestParamsSchema: SetLevelRequestParamsSchema$1,
		SetLevelRequestSchema: SetLevelRequestSchema$1,
		LoggingMessageNotificationParamsSchema: LoggingMessageNotificationParamsSchema$1,
		LoggingMessageNotificationSchema: LoggingMessageNotificationSchema$1,
		ModelHintSchema: ModelHintSchema$1,
		ModelPreferencesSchema: ModelPreferencesSchema$1,
		ToolChoiceSchema: ToolChoiceSchema$1,
		ToolResultContentSchema: ToolResultContentSchema$1,
		SamplingContentSchema: SamplingContentSchema$1,
		SamplingMessageContentBlockSchema: SamplingMessageContentBlockSchema$1,
		SamplingMessageSchema: SamplingMessageSchema$1,
		CreateMessageRequestParamsSchema: CreateMessageRequestParamsSchema$1,
		CreateMessageRequestSchema: CreateMessageRequestSchema$1,
		CreateMessageResultSchema: CreateMessageResultSchema$1,
		CreateMessageResultWithToolsSchema: CreateMessageResultWithToolsSchema$1,
		BooleanSchemaSchema: BooleanSchemaSchema$1,
		StringSchemaSchema: StringSchemaSchema$1,
		NumberSchemaSchema: NumberSchemaSchema$1,
		UntitledSingleSelectEnumSchemaSchema: UntitledSingleSelectEnumSchemaSchema$1,
		TitledSingleSelectEnumSchemaSchema: TitledSingleSelectEnumSchemaSchema$1,
		LegacyTitledEnumSchemaSchema: LegacyTitledEnumSchemaSchema$1,
		SingleSelectEnumSchemaSchema: SingleSelectEnumSchemaSchema$1,
		UntitledMultiSelectEnumSchemaSchema: UntitledMultiSelectEnumSchemaSchema$1,
		TitledMultiSelectEnumSchemaSchema: TitledMultiSelectEnumSchemaSchema$1,
		MultiSelectEnumSchemaSchema: MultiSelectEnumSchemaSchema$1,
		EnumSchemaSchema: EnumSchemaSchema$1,
		PrimitiveSchemaDefinitionSchema: PrimitiveSchemaDefinitionSchema$1,
		ElicitRequestFormParamsSchema: ElicitRequestFormParamsSchema$1,
		ElicitRequestURLParamsSchema: ElicitRequestURLParamsSchema$1,
		ElicitRequestParamsSchema: ElicitRequestParamsSchema$1,
		ElicitRequestSchema: ElicitRequestSchema$1,
		ElicitationCompleteNotificationParamsSchema: ElicitationCompleteNotificationParamsSchema$1,
		ElicitationCompleteNotificationSchema: ElicitationCompleteNotificationSchema$1,
		ElicitResultSchema: ElicitResultSchema$1,
		ResourceTemplateReferenceSchema: ResourceTemplateReferenceSchema$1,
		PromptReferenceSchema: PromptReferenceSchema$1,
		CompleteRequestParamsSchema: CompleteRequestParamsSchema$1,
		CompleteRequestSchema: CompleteRequestSchema$1,
		CompleteResultSchema: CompleteResultSchema$1,
		RootSchema: RootSchema$1,
		ListRootsRequestSchema: ListRootsRequestSchema$1,
		ListRootsResultSchema: ListRootsResultSchema$1,
		RootsListChangedNotificationSchema: RootsListChangedNotificationSchema$1,
		TaskCreationParamsSchema: TaskCreationParamsSchema$1,
		TaskStatusSchema: TaskStatusSchema$1,
		TaskSchema: TaskSchema$1,
		CreateTaskResultSchema: CreateTaskResultSchema$1,
		TaskStatusNotificationParamsSchema: TaskStatusNotificationParamsSchema$1,
		TaskStatusNotificationSchema: TaskStatusNotificationSchema$1,
		GetTaskRequestSchema: GetTaskRequestSchema$1,
		GetTaskResultSchema: GetTaskResultSchema$1,
		GetTaskPayloadRequestSchema: GetTaskPayloadRequestSchema$1,
		GetTaskPayloadResultSchema: GetTaskPayloadResultSchema$1,
		ListTasksRequestSchema: ListTasksRequestSchema$1,
		ListTasksResultSchema: ListTasksResultSchema$1,
		CancelTaskRequestSchema: CancelTaskRequestSchema$1,
		CancelTaskResultSchema: ResultSchema$1.merge(TaskSchema$1),
		ClientRequestSchema: union([
			PingRequestSchema$1,
			InitializeRequestSchema$1,
			CompleteRequestSchema$1,
			SetLevelRequestSchema$1,
			GetPromptRequestSchema$1,
			ListPromptsRequestSchema$1,
			ListResourcesRequestSchema$1,
			ListResourceTemplatesRequestSchema$1,
			ReadResourceRequestSchema$1,
			SubscribeRequestSchema$1,
			UnsubscribeRequestSchema$1,
			CallToolRequestSchema$1,
			ListToolsRequestSchema$1,
			GetTaskRequestSchema$1,
			GetTaskPayloadRequestSchema$1,
			ListTasksRequestSchema$1,
			CancelTaskRequestSchema$1
		]),
		ClientNotificationSchema: union([
			CancelledNotificationSchema$1,
			ProgressNotificationSchema$1,
			InitializedNotificationSchema$1,
			RootsListChangedNotificationSchema$1,
			TaskStatusNotificationSchema$1
		]),
		ClientResultSchema: union([
			EmptyResultSchema$1,
			CreateMessageResultSchema$1,
			CreateMessageResultWithToolsSchema$1,
			ElicitResultSchema$1,
			ListRootsResultSchema$1,
			GetTaskResultSchema$1,
			ListTasksResultSchema$1,
			CreateTaskResultSchema$1
		]),
		ServerRequestSchema: union([
			PingRequestSchema$1,
			CreateMessageRequestSchema$1,
			ElicitRequestSchema$1,
			ListRootsRequestSchema$1,
			GetTaskRequestSchema$1,
			GetTaskPayloadRequestSchema$1,
			ListTasksRequestSchema$1,
			CancelTaskRequestSchema$1
		]),
		ServerNotificationSchema: union([
			CancelledNotificationSchema$1,
			ProgressNotificationSchema$1,
			LoggingMessageNotificationSchema$1,
			ResourceUpdatedNotificationSchema$1,
			ResourceListChangedNotificationSchema$1,
			ToolListChangedNotificationSchema$1,
			PromptListChangedNotificationSchema$1,
			TaskStatusNotificationSchema$1,
			ElicitationCompleteNotificationSchema$1
		]),
		ServerResultSchema: union([
			EmptyResultSchema$1,
			InitializeResultSchema$1,
			CompleteResultSchema$1,
			GetPromptResultSchema$1,
			ListPromptsResultSchema$1,
			ListResourcesResultSchema$1,
			ListResourceTemplatesResultSchema$1,
			ReadResourceResultSchema$1,
			CallToolResultSchema$1,
			ListToolsResultSchema$1,
			GetTaskResultSchema$1,
			ListTasksResultSchema$1,
			CreateTaskResultSchema$1
		]),
		CallToolResultWireSchema: unknown().superRefine((value, ctx) => {
			if (typeof value !== "object" || value === null || Array.isArray(value) || value.content !== void 0) return;
			for (const key of TOOL_RESULT_FOREIGN_FAMILY_KEYS) if (key in value) {
				ctx.addIssue({
					code: "custom",
					message: `content is required when the body carries '${key}' — another result family cannot default into an empty tools/call success`
				});
				return;
			}
		}).transform(normalizeContentlessToolResult).pipe(CallToolResultSchema$1)
	};
}
let memo$1;
/**
* Builds the era wire-schema set on first call and returns the same object
* thereafter. Module evaluation stays construction-free so importing the
* era codec/registry costs nothing until the first validation actually
* needs a schema; the registry, the codec, and the eager `schemas.ts`
* shim all pull through this memo, so reference identity holds across
* every consumer.
*/
function buildSchemas2025() {
	return memo$1 ??= build$1();
}
/**
* SEP-2106 legacy `outputSchema` wrap helpers (2025-era projection only).
*
* The neutral / 2026-07-28 model lets a tool's `outputSchema` carry any JSON
* Schema root. The 2025-11-25 wire shape requires `type:'object'` at the root,
* so when an era-blind handler advertises a non-object root, the 2025 codec's
* `encodeResult('tools/list', …)` projects it down to
* `{type:'object', properties:{result:<natural>}, required:['result']}`, and
* `projectCallToolResult` wraps the matching `structuredContent` as
* `{result:<value>}`. The 2026 codec's projections are the identity.
*
* These helpers are wire-layer property — they exist so the projection can
* live behind {@link WireCodec.encodeResult} / {@link WireCodec.projectCallToolResult}
* and never be re-derived in shared/ or server-side code.
*/
/**
* Whether a JSON Schema's root is non-object: either an explicit non-object
* `type`, or a typeless root such as `{anyOf:[…]}`. Object-shaped typeless
* roots that the schema-conversion layer can prove are objects are stamped
* `type:'object'` upstream, so they reach this predicate as object roots.
*/
function isNonObjectJsonSchemaRoot(json) {
	return json["type"] !== "object";
}
/**
* Keyword-position keys whose values are instance data (not subschemas). A
* `{$ref:…}` appearing inside one is a literal value, not a JSON Pointer to
* rewrite. Only consulted when the current object is in keyword position —
* a PROPERTY named `default`/`const` (under `properties`/`$defs`/…) is a name
* position whose value IS a subschema and is recursed into.
*/
const REF_REWRITE_DATA_POSITION_KEYS = /* @__PURE__ */ new Set([
	"const",
	"enum",
	"default",
	"examples"
]);
/**
* Keyword-position keys whose value is a name→subschema map. Entries inside
* such a map are in NAME position: their keys are author-chosen property
* names (which may collide with JSON Schema keywords), their values are
* subschemas to recurse into.
*/
const REF_REWRITE_NAME_MAP_KEYS = /* @__PURE__ */ new Set([
	"properties",
	"patternProperties",
	"$defs",
	"definitions",
	"dependentSchemas",
	"dependencies"
]);
/**
* Whether a subtree's `$id` establishes a new resolution base. A fragment-only
* `$id` (`"#item"`, the draft-07/06 spelling of 2020-12's `$anchor`) does not
* change the RFC 3986 base URI — same-document pointers inside still resolve
* against the document root and must be rewritten.
*/
function establishesNewBase(id) {
	return id !== void 0 && !(typeof id === "string" && id.startsWith("#"));
}
/**
* Wrap a non-object output schema in the 2025-era envelope:
* `{type:'object', properties:{result:<natural>}, required:['result']}`.
*
* Same-document `$ref` / `$dynamicRef` JSON Pointers inside the natural schema
* (e.g. `#/properties/foo` produced by zod for de-duplicated/recursive types)
* are rewritten to account for the new `#/properties/result` root: bare `#` →
* `#/properties/result`, `#/…` → `#/properties/result/…`. Cross-document refs
* (anything not starting with `#`) are left untouched.
*
* The rewrite is position-aware: data-valued keywords
* (`const`/`enum`/`default`/`examples`) in keyword position are NOT descended
* into; the same names appearing as property names under
* `properties`/`patternProperties`/`$defs`/`definitions`/`dependentSchemas`/
* `dependencies` ARE descended into (they're subschemas). The rewrite is also
* `$id`-scoped: if the natural root carries a base-establishing `$id` no
* pointer is rewritten (same-document refs inside resolve against the embedded
* `$id` base, not the wrapper root), and any subtree that establishes its own
* `$id` is left untouched for the same reason. Fragment-only `$id` (`"#item"`,
* draft-07's anchor spelling) does not establish a base and IS descended into.
*/
function wrapOutputSchemaForLegacy(natural) {
	const $schema = typeof natural["$schema"] === "string" ? natural["$schema"] : void 0;
	if (establishesNewBase(natural["$id"])) return {
		...$schema !== void 0 && { $schema },
		type: "object",
		properties: { result: natural },
		required: ["result"]
	};
	const convertRecursiveRefs = declares2019Dialect(natural["$schema"]) && natural["$recursiveAnchor"] !== true;
	const rewriteRefs = (node, parentIsNameMap) => {
		if (Array.isArray(node)) return node.map((item) => rewriteRefs(item, false));
		if (node === null || typeof node !== "object") return node;
		if (!parentIsNameMap && establishesNewBase(node["$id"])) return node;
		const out = {};
		let convertedRecursion = false;
		for (const [k, v] of Object.entries(node)) if (parentIsNameMap) out[k] = rewriteRefs(v, false);
		else if ((k === "$ref" || k === "$dynamicRef") && typeof v === "string") out[k] = v === "#" ? "#/properties/result" : v.startsWith("#/") ? `#/properties/result${v.slice(1)}` : v;
		else if (k === "$recursiveRef" && v === "#" && convertRecursiveRefs) convertedRecursion = true;
		else if (REF_REWRITE_DATA_POSITION_KEYS.has(k)) out[k] = v;
		else if (REF_REWRITE_NAME_MAP_KEYS.has(k)) out[k] = rewriteRefs(v, true);
		else out[k] = rewriteRefs(v, false);
		if (convertedRecursion) if ("$ref" in out) out["allOf"] = [...Array.isArray(out["allOf"]) ? out["allOf"] : [], { $ref: "#/properties/result" }];
		else out["$ref"] = "#/properties/result";
		return out;
	};
	return {
		...$schema !== void 0 && { $schema },
		type: "object",
		properties: { result: rewriteRefs(natural, false) },
		required: ["result"]
	};
}
const requestMethodKeys$1 = {
	ping: null,
	initialize: null,
	"completion/complete": null,
	"logging/setLevel": null,
	"prompts/get": null,
	"prompts/list": null,
	"resources/list": null,
	"resources/templates/list": null,
	"resources/read": null,
	"resources/subscribe": null,
	"resources/unsubscribe": null,
	"tools/call": null,
	"tools/list": null,
	"tasks/get": null,
	"tasks/result": null,
	"tasks/list": null,
	"tasks/cancel": null,
	"sampling/createMessage": null,
	"elicitation/create": null,
	"roots/list": null
};
const notificationMethodKeys$1 = {
	"notifications/cancelled": null,
	"notifications/progress": null,
	"notifications/initialized": null,
	"notifications/roots/list_changed": null,
	"notifications/tasks/status": null,
	"notifications/message": null,
	"notifications/resources/updated": null,
	"notifications/resources/list_changed": null,
	"notifications/tools/list_changed": null,
	"notifications/prompts/list_changed": null,
	"notifications/elicitation/complete": null
};
const resultMethodKeys = {
	ping: null,
	initialize: null,
	"completion/complete": null,
	"logging/setLevel": null,
	"prompts/get": null,
	"prompts/list": null,
	"resources/list": null,
	"resources/templates/list": null,
	"resources/read": null,
	"resources/subscribe": null,
	"resources/unsubscribe": null,
	"tools/call": null,
	"tools/list": null,
	"sampling/createMessage": null,
	"elicitation/create": null,
	"roots/list": null
};
let maps$1;
function registryMaps() {
	if (maps$1) return maps$1;
	const s = buildSchemas2025();
	maps$1 = {
		requestSchemas: {
			ping: s.PingRequestSchema,
			initialize: s.InitializeRequestSchema,
			"completion/complete": s.CompleteRequestSchema,
			"logging/setLevel": s.SetLevelRequestSchema,
			"prompts/get": s.GetPromptRequestSchema,
			"prompts/list": s.ListPromptsRequestSchema,
			"resources/list": s.ListResourcesRequestSchema,
			"resources/templates/list": s.ListResourceTemplatesRequestSchema,
			"resources/read": s.ReadResourceRequestSchema,
			"resources/subscribe": s.SubscribeRequestSchema,
			"resources/unsubscribe": s.UnsubscribeRequestSchema,
			"tools/call": s.CallToolRequestSchema,
			"tools/list": s.ListToolsRequestSchema,
			"tasks/get": s.GetTaskRequestSchema,
			"tasks/result": s.GetTaskPayloadRequestSchema,
			"tasks/list": s.ListTasksRequestSchema,
			"tasks/cancel": s.CancelTaskRequestSchema,
			"sampling/createMessage": s.CreateMessageRequestSchema,
			"elicitation/create": s.ElicitRequestSchema,
			"roots/list": s.ListRootsRequestSchema
		},
		notificationSchemas: {
			"notifications/cancelled": s.CancelledNotificationSchema,
			"notifications/progress": s.ProgressNotificationSchema,
			"notifications/initialized": s.InitializedNotificationSchema,
			"notifications/roots/list_changed": s.RootsListChangedNotificationSchema,
			"notifications/tasks/status": s.TaskStatusNotificationSchema,
			"notifications/message": s.LoggingMessageNotificationSchema,
			"notifications/resources/updated": s.ResourceUpdatedNotificationSchema,
			"notifications/resources/list_changed": s.ResourceListChangedNotificationSchema,
			"notifications/tools/list_changed": s.ToolListChangedNotificationSchema,
			"notifications/prompts/list_changed": s.PromptListChangedNotificationSchema,
			"notifications/elicitation/complete": s.ElicitationCompleteNotificationSchema
		},
		resultSchemas: {
			ping: s.EmptyResultSchema,
			initialize: s.InitializeResultSchema,
			"completion/complete": s.CompleteResultSchema,
			"logging/setLevel": s.EmptyResultSchema,
			"prompts/get": s.GetPromptResultSchema,
			"prompts/list": s.ListPromptsResultSchema,
			"resources/list": s.ListResourcesResultSchema,
			"resources/templates/list": s.ListResourceTemplatesResultSchema,
			"resources/read": s.ReadResourceResultSchema,
			"resources/subscribe": s.EmptyResultSchema,
			"resources/unsubscribe": s.EmptyResultSchema,
			"tools/call": s.CallToolResultWireSchema,
			"tools/list": s.ListToolsResultSchema,
			"sampling/createMessage": s.CreateMessageResultWithToolsSchema,
			"elicitation/create": s.ElicitResultSchema,
			"roots/list": s.ListRootsResultSchema
		}
	};
	return maps$1;
}
/** The 2025-era request-method set (registry membership = the deletion story). */
function hasRequestMethod2025(method) {
	return Object.prototype.hasOwnProperty.call(requestMethodKeys$1, method);
}
/** The 2025-era notification-method set. */
function hasNotificationMethod2025(method) {
	return Object.prototype.hasOwnProperty.call(notificationMethodKeys$1, method);
}
/** Result-map membership: exactly the era's typed-method subset (no task entries, no 2026-only methods). */
function hasResultMethod(method) {
	return Object.prototype.hasOwnProperty.call(resultMethodKeys, method);
}
function getResultSchema(method) {
	return hasResultMethod(method) ? registryMaps().resultSchemas[method] : void 0;
}
function getRequestSchema(method) {
	return hasRequestMethod2025(method) ? registryMaps().requestSchemas[method] : void 0;
}
function getNotificationSchema(method) {
	return hasNotificationMethod2025(method) ? registryMaps().notificationSchemas[method] : void 0;
}
Object.keys(requestMethodKeys$1);
Object.keys(notificationMethodKeys$1);
function isPlainObject$6(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** Tri-state wrap of an optional Zod schema lookup (the function-only contract). */
function triState$1(schema, raw) {
	if (schema === void 0) return {
		ok: false,
		reason: "not-in-era"
	};
	const parsed = schema.safeParse(raw);
	return parsed.success ? {
		ok: true,
		value: parsed.data
	} : {
		ok: false,
		reason: "invalid",
		message: String(parsed.error)
	};
}
const NOT_IN_ERA$1 = {
	ok: false,
	reason: "not-in-era"
};
/** Whether a `tools/list` entry advertises a non-object `outputSchema` root that needs the SEP-2106 legacy wrap. */
function toolNeedsLegacyWrap(t) {
	return isPlainObject$6(t) && isPlainObject$6(t["outputSchema"]) && isNonObjectJsonSchemaRoot(t["outputSchema"]);
}
/** The wire→neutral trust boundary: a decoded 2025-era wire result is adopted as the neutral `Result` here (the module's single deliberate assertion). */
function toNeutralResult(value) {
	return value;
}
const rev2025Codec = {
	era: "2025-11-25",
	hasRequestMethod: hasRequestMethod2025,
	hasNotificationMethod: hasNotificationMethod2025,
	validateRequest: (method, raw) => triState$1(getRequestSchema(method), raw),
	validateResult: (method, raw) => triState$1(getResultSchema(method), raw),
	validateNotification: (method, raw) => triState$1(getNotificationSchema(method), raw),
	hasInputRequestMethod: () => false,
	validateInputRequest: () => NOT_IN_ERA$1,
	validateInputResponse: () => NOT_IN_ERA$1,
	samplingResultVariant: ((hasTools, raw) => {
		const s = buildSchemas2025();
		return triState$1(hasTools ? s.CreateMessageResultWithToolsSchema : s.CreateMessageResultSchema, raw);
	}),
	outboundEnvelope: (_material) => void 0,
	validateEnvelopeMeta: (_meta) => [],
	projectCallToolResult(result, advertisedOutputSchema) {
		const withText = appendTextFallbackForNonObject(result);
		const sc = withText.structuredContent;
		if (sc === void 0) return withText;
		const valueIsNonObject = typeof sc !== "object" || sc === null || Array.isArray(sc);
		const schemaWrapped = advertisedOutputSchema !== void 0 && isNonObjectJsonSchemaRoot(advertisedOutputSchema);
		if (!valueIsNonObject && !schemaWrapped) return withText;
		return {
			...withText,
			structuredContent: { result: sc }
		};
	},
	decodeResult(_method, raw) {
		if (isPlainObject$6(raw) && "resultType" in raw) {
			const stripped = { ...raw };
			delete stripped["resultType"];
			return {
				kind: "complete",
				result: toNeutralResult(stripped)
			};
		}
		return {
			kind: "complete",
			result: toNeutralResult(raw)
		};
	},
	encodeResult(method, result) {
		if (method !== "tools/list") return result;
		const tools = result.tools;
		if (!Array.isArray(tools) || !tools.some((t) => toolNeedsLegacyWrap(t))) return result;
		return {
			...result,
			tools: tools.map((t) => toolNeedsLegacyWrap(t) ? {
				...t,
				outputSchema: wrapOutputSchemaForLegacy(t.outputSchema)
			} : t)
		};
	},
	encodeErrorCode: (code) => code === -32002 ? -32602 : code,
	checkInboundEnvelope: (_material) => void 0
};
/**
* 2026-era wire schemas (protocol revision 2026-07-28).
*
* Fully self-contained — no runtime imports from types/schemas.ts. The
* neutral types/schemas.ts layer is the public-API superset and is free to
* evolve; this file is the 2026 wire-parse contract and is BEHAVIOR-FROZEN
* against the 2026-07-28 anchor. Every era-shared building block (content
* blocks, resources, prompts, capabilities, notifications, …) that the wire
* shapes compose is a frozen LOCAL copy — verbatim from the neutral layer at
* the point this revision was sealed, dependencies first. The only cross-layer
* dependency is `import type { JSONObject, JSONValue }` from the neutral types
* barrel — pure structural type aliases with no parse behavior.
*
* This module is the only place the per-request `_meta` envelope is modeled.
* The envelope is wire-only vocabulary: the protocol layer lifts it off
* inbound requests before any handler runs and surfaces it at
* `ctx.mcpReq.envelope`; the 2026-era codec enforces its requiredness at
* dispatch time (`checkInboundEnvelope`) - the former neutral-schema JSDoc
* deferral ("enforced per request at dispatch time, not here") is now
* discharged by that codec step.
*
* No 2025-era traffic ever touches this module, so requiredness here is
* bare and spec-exact (the shared-schema `.catch` hazards do not apply).
*
* SPEC-CURRENCY RE-SEAL (2026-07-17): the 2026-07-28 revision was re-sealed
* upstream by spec PR #3002 (commit 71e30695, merged 2026-07-15 — after the
* previous anchor pin f68d864a): the envelope's `clientInfo` demoted from
* required to SHOULD, and `DiscoverResult.serverInfo` moved from the result
* body to the new `ResultMetaObject` key
* `_meta['io.modelcontextprotocol/serverInfo']` (optional on every result).
* The shapes below are the re-sealed anchor, exactly — no pre-#3002 shape is
* modeled anywhere (per ruling: the final revision is the only 2026-07-28).
*/
function build() {
	const JSONValueSchema$1 = lazy(() => union([
		string(),
		number$1(),
		boolean(),
		_null(),
		record(string(), JSONValueSchema$1),
		array(JSONValueSchema$1)
	]));
	const JSONObjectSchema$1 = record(string(), JSONValueSchema$1);
	/**
	* A progress token, used to associate progress notifications with the original request.
	*/
	const ProgressTokenSchema$1 = union([string(), number$1().int()]);
	/**
	* An opaque token used to represent a cursor for pagination.
	*/
	const CursorSchema$1 = string();
	/**
	* A uniquely identifying ID for a request in JSON-RPC.
	*/
	const RequestIdSchema$1 = union([string(), number$1().int()]);
	/**
	* The sender or recipient of messages and data in a conversation.
	*/
	const RoleSchema$1 = _enum(["user", "assistant"]);
	/**
	* The severity of a log message.
	*/
	const LoggingLevelSchema$1 = _enum([
		"debug",
		"info",
		"notice",
		"warning",
		"error",
		"critical",
		"alert",
		"emergency"
	]);
	/**
	* A Zod schema for validating Base64 strings that is more performant and
	* robust for very large inputs than the default regex-based check. It avoids
	* stack overflows by using the native `atob` function for validation.
	*/
	const Base64Schema = string().refine((val) => {
		try {
			atob(val);
			return true;
		} catch {
			return false;
		}
	}, { message: "Invalid Base64 string" });
	/** @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only. */
	const TaskMetadataSchema$1 = object({ ttl: number$1().optional() });
	/** @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only. */
	const RelatedTaskMetadataSchema$1 = object({ taskId: string() });
	const RequestMetaSchema$1 = looseObject({
		progressToken: ProgressTokenSchema$1.optional(),
		"io.modelcontextprotocol/related-task": RelatedTaskMetadataSchema$1.optional()
	});
	const BaseRequestParamsSchema$1 = object({ _meta: RequestMetaSchema$1.optional() });
	/** @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only. */
	const TaskAugmentedRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({ task: TaskMetadataSchema$1.optional() });
	const NotificationsParamsSchema$1 = object({ _meta: RequestMetaSchema$1.optional() });
	const NotificationSchema$1 = object({
		method: string(),
		params: NotificationsParamsSchema$1.loose().optional()
	});
	const IconSchema$1 = object({
		src: string(),
		mimeType: string().optional(),
		sizes: array(string()).optional(),
		theme: _enum(["light", "dark"]).optional()
	});
	const IconsSchema$1 = object({ icons: array(IconSchema$1).optional() });
	const BaseMetadataSchema$1 = object({
		name: string(),
		title: string().optional()
	});
	const ImplementationSchema$1 = BaseMetadataSchema$1.extend({
		...BaseMetadataSchema$1.shape,
		...IconsSchema$1.shape,
		version: string(),
		websiteUrl: string().optional(),
		description: string().optional()
	});
	const ElicitationCapabilitySchema = preprocess((value) => {
		if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return { form: {} };
		return value;
	}, intersection(object({
		form: intersection(object({ applyDefaults: boolean().optional() }), JSONObjectSchema$1).optional(),
		url: JSONObjectSchema$1.optional()
	}), JSONObjectSchema$1.optional()));
	/** @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only. */
	const ClientTasksCapabilitySchema$1 = looseObject({
		list: JSONObjectSchema$1.optional(),
		cancel: JSONObjectSchema$1.optional(),
		requests: looseObject({
			sampling: looseObject({ createMessage: JSONObjectSchema$1.optional() }).optional(),
			elicitation: looseObject({ create: JSONObjectSchema$1.optional() }).optional()
		}).optional()
	});
	/** @deprecated 2025-11-25 wire vocabulary with no SDK runtime; kept importable for interoperability only. */
	const ServerTasksCapabilitySchema$1 = looseObject({
		list: JSONObjectSchema$1.optional(),
		cancel: JSONObjectSchema$1.optional(),
		requests: looseObject({ tools: looseObject({ call: JSONObjectSchema$1.optional() }).optional() }).optional()
	});
	const ClientCapabilitiesSchema$1 = object({
		experimental: record(string(), JSONObjectSchema$1).optional(),
		sampling: object({
			context: JSONObjectSchema$1.optional(),
			tools: JSONObjectSchema$1.optional()
		}).optional(),
		elicitation: ElicitationCapabilitySchema.optional(),
		roots: object({ listChanged: boolean().optional() }).optional(),
		tasks: ClientTasksCapabilitySchema$1.optional(),
		extensions: record(string(), JSONObjectSchema$1).optional()
	});
	const ServerCapabilitiesSchema$1 = object({
		experimental: record(string(), JSONObjectSchema$1).optional(),
		logging: JSONObjectSchema$1.optional(),
		completions: JSONObjectSchema$1.optional(),
		prompts: object({ listChanged: boolean().optional() }).optional(),
		resources: object({
			subscribe: boolean().optional(),
			listChanged: boolean().optional()
		}).optional(),
		tools: object({ listChanged: boolean().optional() }).optional(),
		tasks: ServerTasksCapabilitySchema$1.optional(),
		extensions: record(string(), JSONObjectSchema$1).optional()
	});
	const ProgressSchema$1 = object({
		progress: number$1(),
		total: optional(number$1()),
		message: optional(string())
	});
	const ProgressNotificationParamsSchema$1 = object({
		...NotificationsParamsSchema$1.shape,
		...ProgressSchema$1.shape,
		progressToken: ProgressTokenSchema$1
	});
	const ProgressNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/progress"),
		params: ProgressNotificationParamsSchema$1
	});
	const LoggingMessageNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({
		level: LoggingLevelSchema$1,
		logger: string().optional(),
		data: unknown()
	});
	const LoggingMessageNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/message"),
		params: LoggingMessageNotificationParamsSchema$1
	});
	const ResourceContentsSchema$1 = object({
		uri: string(),
		mimeType: optional(string()),
		_meta: record(string(), unknown()).optional()
	});
	const TextResourceContentsSchema$1 = ResourceContentsSchema$1.extend({ text: string() });
	const BlobResourceContentsSchema$1 = ResourceContentsSchema$1.extend({ blob: Base64Schema });
	const AnnotationsSchema$1 = object({
		audience: array(RoleSchema$1).optional(),
		priority: number$1().min(0).max(1).optional(),
		lastModified: datetime({ offset: true }).optional()
	});
	const ResourceSchema$1 = object({
		...BaseMetadataSchema$1.shape,
		...IconsSchema$1.shape,
		uri: string(),
		description: optional(string()),
		mimeType: optional(string()),
		size: optional(number$1()),
		annotations: AnnotationsSchema$1.optional(),
		_meta: optional(looseObject({}))
	});
	const ResourceTemplateSchema$1 = object({
		...BaseMetadataSchema$1.shape,
		...IconsSchema$1.shape,
		uriTemplate: string(),
		description: optional(string()),
		mimeType: optional(string()),
		annotations: AnnotationsSchema$1.optional(),
		_meta: optional(looseObject({}))
	});
	const ResourceListChangedNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/resources/list_changed"),
		params: NotificationsParamsSchema$1.optional()
	});
	const ResourceUpdatedNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({ uri: string() });
	const ResourceUpdatedNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/resources/updated"),
		params: ResourceUpdatedNotificationParamsSchema$1
	});
	const PromptArgumentSchema$1 = object({
		name: string(),
		description: optional(string()),
		required: optional(boolean())
	});
	const PromptSchema$1 = object({
		...BaseMetadataSchema$1.shape,
		...IconsSchema$1.shape,
		description: optional(string()),
		arguments: optional(array(PromptArgumentSchema$1)),
		_meta: optional(looseObject({}))
	});
	const PromptListChangedNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/prompts/list_changed"),
		params: NotificationsParamsSchema$1.optional()
	});
	const TextContentSchema$1 = object({
		type: literal("text"),
		text: string(),
		annotations: AnnotationsSchema$1.optional(),
		_meta: record(string(), unknown()).optional()
	});
	const ImageContentSchema$1 = object({
		type: literal("image"),
		data: Base64Schema,
		mimeType: string(),
		annotations: AnnotationsSchema$1.optional(),
		_meta: record(string(), unknown()).optional()
	});
	const AudioContentSchema$1 = object({
		type: literal("audio"),
		data: Base64Schema,
		mimeType: string(),
		annotations: AnnotationsSchema$1.optional(),
		_meta: record(string(), unknown()).optional()
	});
	const ToolUseContentSchema$1 = object({
		type: literal("tool_use"),
		name: string(),
		id: string(),
		input: record(string(), unknown()),
		_meta: record(string(), unknown()).optional()
	});
	const EmbeddedResourceSchema$1 = object({
		type: literal("resource"),
		resource: union([TextResourceContentsSchema$1, BlobResourceContentsSchema$1]),
		annotations: AnnotationsSchema$1.optional(),
		_meta: record(string(), unknown()).optional()
	});
	const ResourceLinkSchema$1 = ResourceSchema$1.extend({ type: literal("resource_link") });
	const ContentBlockSchema$1 = union([
		TextContentSchema$1,
		ImageContentSchema$1,
		AudioContentSchema$1,
		ResourceLinkSchema$1,
		EmbeddedResourceSchema$1
	]);
	const PromptMessageSchema$1 = object({
		role: RoleSchema$1,
		content: ContentBlockSchema$1
	});
	const ToolAnnotationsSchema$1 = object({
		title: string().optional(),
		readOnlyHint: boolean().optional(),
		destructiveHint: boolean().optional(),
		idempotentHint: boolean().optional(),
		openWorldHint: boolean().optional()
	});
	const ToolListChangedNotificationSchema$1 = NotificationSchema$1.extend({
		method: literal("notifications/tools/list_changed"),
		params: NotificationsParamsSchema$1.optional()
	});
	const ModelHintSchema$1 = object({ name: string().optional() });
	const ModelPreferencesSchema$1 = object({
		hints: array(ModelHintSchema$1).optional(),
		costPriority: number$1().min(0).max(1).optional(),
		speedPriority: number$1().min(0).max(1).optional(),
		intelligencePriority: number$1().min(0).max(1).optional()
	});
	const ToolChoiceSchema$1 = object({ mode: _enum([
		"auto",
		"required",
		"none"
	]).optional() });
	const BooleanSchemaSchema$1 = object({
		type: literal("boolean"),
		title: string().optional(),
		description: string().optional(),
		default: boolean().optional()
	});
	const StringSchemaSchema$1 = object({
		type: literal("string"),
		title: string().optional(),
		description: string().optional(),
		minLength: number$1().optional(),
		maxLength: number$1().optional(),
		format: _enum([
			"email",
			"uri",
			"date",
			"date-time"
		]).optional(),
		default: string().optional()
	});
	const NumberSchemaSchema$1 = object({
		type: _enum(["number", "integer"]),
		title: string().optional(),
		description: string().optional(),
		minimum: number$1().optional(),
		maximum: number$1().optional(),
		default: number$1().optional()
	});
	const UntitledSingleSelectEnumSchemaSchema$1 = object({
		type: literal("string"),
		title: string().optional(),
		description: string().optional(),
		enum: array(string()),
		default: string().optional()
	});
	const TitledSingleSelectEnumSchemaSchema$1 = object({
		type: literal("string"),
		title: string().optional(),
		description: string().optional(),
		oneOf: array(object({
			const: string(),
			title: string()
		})),
		default: string().optional()
	});
	const LegacyTitledEnumSchemaSchema$1 = object({
		type: literal("string"),
		title: string().optional(),
		description: string().optional(),
		enum: array(string()),
		enumNames: array(string()).optional(),
		default: string().optional()
	});
	const SingleSelectEnumSchemaSchema$1 = union([UntitledSingleSelectEnumSchemaSchema$1, TitledSingleSelectEnumSchemaSchema$1]);
	const UntitledMultiSelectEnumSchemaSchema$1 = object({
		type: literal("array"),
		title: string().optional(),
		description: string().optional(),
		minItems: number$1().optional(),
		maxItems: number$1().optional(),
		items: object({
			type: literal("string"),
			enum: array(string())
		}),
		default: array(string()).optional()
	});
	const TitledMultiSelectEnumSchemaSchema$1 = object({
		type: literal("array"),
		title: string().optional(),
		description: string().optional(),
		minItems: number$1().optional(),
		maxItems: number$1().optional(),
		items: object({ anyOf: array(object({
			const: string(),
			title: string()
		})) }),
		default: array(string()).optional()
	});
	const MultiSelectEnumSchemaSchema$1 = union([UntitledMultiSelectEnumSchemaSchema$1, TitledMultiSelectEnumSchemaSchema$1]);
	const EnumSchemaSchema$1 = union([
		LegacyTitledEnumSchemaSchema$1,
		SingleSelectEnumSchemaSchema$1,
		MultiSelectEnumSchemaSchema$1
	]);
	const PrimitiveSchemaDefinitionSchema$1 = union([
		EnumSchemaSchema$1,
		BooleanSchemaSchema$1,
		StringSchemaSchema$1,
		NumberSchemaSchema$1
	]);
	const ElicitRequestFormParamsSchema$1 = TaskAugmentedRequestParamsSchema$1.extend({
		mode: literal("form").optional(),
		message: string(),
		requestedSchema: object({
			type: literal("object"),
			properties: record(string(), PrimitiveSchemaDefinitionSchema$1),
			required: array(string()).optional()
		}).catchall(unknown())
	});
	const ResourceTemplateReferenceSchema$1 = object({
		type: literal("ref/resource"),
		uri: string()
	});
	const PromptReferenceSchema$1 = object({
		type: literal("ref/prompt"),
		name: string()
	});
	const RootSchema$1 = object({
		uri: string().startsWith("file://"),
		name: string().optional(),
		_meta: record(string(), unknown()).optional()
	});
	const sharedClientCapabilityShape = ClientCapabilitiesSchema$1.shape;
	const ClientCapabilities2026Schema = object({
		experimental: sharedClientCapabilityShape.experimental,
		sampling: sharedClientCapabilityShape.sampling,
		elicitation: sharedClientCapabilityShape.elicitation,
		roots: sharedClientCapabilityShape.roots,
		extensions: sharedClientCapabilityShape.extensions
	});
	const sharedServerCapabilityShape = ServerCapabilitiesSchema$1.shape;
	const ServerCapabilities2026Schema = object({
		experimental: sharedServerCapabilityShape.experimental,
		logging: sharedServerCapabilityShape.logging,
		completions: sharedServerCapabilityShape.completions,
		prompts: sharedServerCapabilityShape.prompts,
		resources: sharedServerCapabilityShape.resources,
		tools: sharedServerCapabilityShape.tools,
		extensions: sharedServerCapabilityShape.extensions
	});
	/**
	* The per-request `_meta` envelope carried by every request under protocol revision
	* 2026-07-28: the protocol version governing the request, the client implementation
	* info, and the client's capabilities — declared per request rather than once at
	* initialization — plus the optional log-level opt-in.
	*
	* This schema models the complete envelope on its own (loose: foreign keys
	* pass through - the lift extracts exactly the reserved keys, so enforcement
	* never sees extension material). Requiredness is enforced per request at
	* dispatch time by the 2026-era codec's `checkInboundEnvelope` step.
	*/
	const RequestMetaEnvelopeSchema = looseObject({
		progressToken: ProgressTokenSchema$1.optional(),
		[PROTOCOL_VERSION_META_KEY]: string(),
		[CLIENT_INFO_META_KEY]: ImplementationSchema$1.optional(),
		[CLIENT_CAPABILITIES_META_KEY]: ClientCapabilities2026Schema,
		[LOG_LEVEL_META_KEY]: LoggingLevelSchema$1.optional()
	});
	/** 2026-era Tool: anchor-exact — no `execution` (deleted vocabulary). */
	const ToolSchema$1 = object({
		...BaseMetadataSchema$1.shape,
		...IconsSchema$1.shape,
		description: string().optional(),
		inputSchema: looseObject({
			$schema: string().optional(),
			type: literal("object")
		}),
		outputSchema: looseObject({ $schema: string().optional() }).optional(),
		annotations: ToolAnnotationsSchema$1.optional(),
		_meta: record(string(), unknown()).optional()
	});
	/** 2026-era ToolResultContent (anchor-exact: `structuredContent?: unknown`). */
	const ToolResultContentSchema$1 = object({
		type: literal("tool_result"),
		toolUseId: string(),
		content: array(ContentBlockSchema$1),
		structuredContent: unknown().optional(),
		isError: boolean().optional(),
		_meta: record(string(), unknown()).optional()
	});
	/** 2026-era sampling content union (composes the forked tool-result shape). */
	const SamplingMessageContentBlockSchema$1 = union([
		TextContentSchema$1,
		ImageContentSchema$1,
		AudioContentSchema$1,
		ToolUseContentSchema$1,
		ToolResultContentSchema$1
	]);
	/** 2026-era SamplingMessage (anchor-exact: single block or array). */
	const SamplingMessageSchema$1 = object({
		role: RoleSchema$1,
		content: union([SamplingMessageContentBlockSchema$1, array(SamplingMessageContentBlockSchema$1)]),
		_meta: record(string(), unknown()).optional()
	});
	/** Open union per the anchor: 'complete' | 'input_required' | string. */
	const ResultTypeSchema = string();
	/**
	* Result `_meta` (anchor `ResultMetaObject`, added by spec PR #3002):
	* loose, with the serverInfo key typed when present; the outbound stamp
	* is the encode contract's `stampServerInfoMeta` step.
	*/
	const ResultMetaSchema = looseObject({ [SERVER_INFO_META_KEY]: ImplementationSchema$1.optional().catch(void 0) });
	const wireMeta = ResultMetaSchema.optional();
	function wireResult(shape) {
		return looseObject({
			_meta: wireMeta,
			resultType: ResultTypeSchema.default("complete"),
			...shape
		});
	}
	const ResultSchema$1 = wireResult({});
	const PaginatedResultSchema$1 = wireResult({ nextCursor: CursorSchema$1.optional() });
	const CallToolResultSchema$1 = wireResult({
		content: array(ContentBlockSchema$1),
		structuredContent: unknown().optional(),
		isError: boolean().optional()
	});
	const ListToolsResultSchema$1 = wireResult({
		ttlMs: number$1().int().min(0),
		cacheScope: _enum(["public", "private"]),
		tools: array(ToolSchema$1),
		nextCursor: CursorSchema$1.optional()
	});
	const ListPromptsResultSchema$1 = wireResult({
		ttlMs: number$1().int().min(0),
		cacheScope: _enum(["public", "private"]),
		prompts: array(PromptSchema$1),
		nextCursor: CursorSchema$1.optional()
	});
	const GetPromptResultSchema$1 = wireResult({
		description: string().optional(),
		messages: array(PromptMessageSchema$1)
	});
	const ListResourcesResultSchema$1 = wireResult({
		ttlMs: number$1().int().min(0),
		cacheScope: _enum(["public", "private"]),
		resources: array(ResourceSchema$1),
		nextCursor: CursorSchema$1.optional()
	});
	const ListResourceTemplatesResultSchema$1 = wireResult({
		ttlMs: number$1().int().min(0),
		cacheScope: _enum(["public", "private"]),
		resourceTemplates: array(ResourceTemplateSchema$1),
		nextCursor: CursorSchema$1.optional()
	});
	const ReadResourceResultSchema$1 = wireResult({
		ttlMs: number$1().int().min(0),
		cacheScope: _enum(["public", "private"]),
		contents: array(union([TextResourceContentsSchema$1, BlobResourceContentsSchema$1]))
	});
	const CompleteResultSchema$1 = wireResult({ completion: object({
		values: array(string()).max(100),
		total: number$1().int().optional(),
		hasMore: boolean().optional()
	}).loose() });
	/** CacheableResult (SEP-2549): ttlMs and cacheScope REQUIRED per the anchor. */
	const CacheableResultSchema = wireResult({
		ttlMs: number$1().int().min(0),
		cacheScope: _enum(["public", "private"])
	});
	const DiscoverResultSchema$1 = wireResult({
		ttlMs: number$1().int().min(0).catch(0),
		cacheScope: _enum(["public", "private"]).catch("private"),
		supportedVersions: array(string()),
		capabilities: ServerCapabilities2026Schema,
		instructions: string().optional()
	});
	/** 2026-era CreateMessageRequestParams (anchor-exact: forked SamplingMessage/Tool, no task augmentation). */
	const CreateMessageRequestParamsSchema$1 = object({
		messages: array(SamplingMessageSchema$1),
		modelPreferences: ModelPreferencesSchema$1.optional(),
		systemPrompt: string().optional(),
		includeContext: _enum([
			"none",
			"thisServer",
			"allServers"
		]).optional(),
		temperature: number$1().optional(),
		maxTokens: number$1().int(),
		stopSequences: array(string()).optional(),
		metadata: JSONObjectSchema$1.optional(),
		tools: array(ToolSchema$1).optional(),
		toolChoice: ToolChoiceSchema$1.optional()
	});
	/** 2026-era embedded sampling request (de-JSON-RPC'd). */
	const CreateMessageRequestSchema$1 = object({
		method: literal("sampling/createMessage"),
		params: CreateMessageRequestParamsSchema$1
	});
	/**
	* 2026-era embedded roots listing request (de-JSON-RPC'd). Embedded input
	* requests do NOT carry the per-request `_meta` envelope on this revision —
	* the anchor declares a bare optional `_meta` on `params`.
	*/
	const ListRootsRequestSchema$1 = object({
		method: literal("roots/list"),
		params: object({ _meta: record(string(), unknown()).optional() }).optional()
	});
	/** 2026-era embedded sampling response (anchor-exact: extends the forked SamplingMessage). */
	const CreateMessageResultSchema$1 = object({
		...SamplingMessageSchema$1.shape,
		model: string(),
		stopReason: string().optional()
	});
	/** 2026-era embedded roots listing response (anchor-exact: bare `roots` array). */
	const ListRootsResultSchema$1 = object({ roots: array(RootSchema$1) });
	/** 2026-era embedded elicitation response (anchor-exact: bare result, restricted content value types). */
	const ElicitResultSchema$1 = object({
		action: _enum([
			"accept",
			"decline",
			"cancel"
		]),
		content: record(string(), union([
			string(),
			number$1(),
			boolean(),
			array(string())
		])).optional()
	});
	/**
	* 2026-era URL-mode elicitation params (anchor-exact fork): the draft removed
	* `elicitationId` (and the `notifications/elicitation/complete` channel it
	* keyed) — the shared schema keeps the field because it is required on the
	* frozen 2025-11-25 revision.
	*/
	const ElicitRequestURLParamsSchema$1 = object({
		mode: literal("url"),
		message: string(),
		url: string().url()
	});
	/** 2026-era elicitation params (form mode is revision-identical; URL mode is the fork above). */
	const ElicitRequestParamsSchema$1 = union([ElicitRequestFormParamsSchema$1, ElicitRequestURLParamsSchema$1]);
	/** 2026-era embedded elicitation request (de-JSON-RPC'd; see the URL-mode fork above). */
	const ElicitRequestSchema$1 = object({
		method: literal("elicitation/create"),
		params: ElicitRequestParamsSchema$1
	});
	/** A single embedded input request (one of the three demoted server→client requests). */
	const InputRequestSchema = union([
		CreateMessageRequestSchema$1,
		ListRootsRequestSchema$1,
		ElicitRequestSchema$1
	]);
	/** A single embedded input response — the BARE result union (never a `{method, result}` wrapper). */
	const InputResponseSchema = union([
		CreateMessageResultSchema$1,
		ListRootsResultSchema$1,
		ElicitResultSchema$1
	]);
	/** Map of embedded input requests, keyed by server-assigned identifiers. */
	const InputRequestsSchema = record(string(), InputRequestSchema);
	/** Map of embedded input responses, keyed by the corresponding request identifiers. */
	const InputResponsesSchema = record(string(), InputResponseSchema);
	/**
	* The wire InputRequiredResult: `resultType: 'input_required'` plus at least
	* one of `inputRequests` / `requestState` (the at-least-one rule is enforced
	* at the server seam, not by this parse shape).
	*/
	const InputRequiredResultSchema = wireResult({
		inputRequests: InputRequestsSchema.optional(),
		requestState: string().optional()
	});
	/** The retry-channel members carried by client-initiated requests on this revision. */
	const retryParamsShape = {
		inputResponses: InputResponsesSchema.optional(),
		requestState: string().optional()
	};
	/** Anchor InputResponseRequestParams: the retry channel on top of the required request `_meta` envelope. */
	const InputResponseRequestParamsSchema = object({
		_meta: RequestMetaEnvelopeSchema,
		...retryParamsShape
	});
	/** Post-lift request `_meta` (progressToken + extension keys; loose). */
	const DispatchRequestMetaSchema = looseObject({ progressToken: ProgressTokenSchema$1.optional() });
	function wireRequest(method, paramsShape) {
		return object({
			method: literal(method),
			params: object({
				_meta: RequestMetaEnvelopeSchema,
				...paramsShape
			})
		});
	}
	function dispatchRequest(method, paramsShape) {
		return object({
			method: literal(method),
			params: object({
				_meta: DispatchRequestMetaSchema.optional(),
				...paramsShape
			}).optional()
		});
	}
	const callToolParamsShape = {
		name: string(),
		arguments: record(string(), unknown()).optional(),
		...retryParamsShape
	};
	const paginatedParamsShape = { cursor: CursorSchema$1.optional() };
	const CallToolRequestSchema$1 = wireRequest("tools/call", callToolParamsShape);
	const ListToolsRequestSchema$1 = wireRequest("tools/list", paginatedParamsShape);
	const ListPromptsRequestSchema$1 = wireRequest("prompts/list", paginatedParamsShape);
	const GetPromptRequestSchema$1 = wireRequest("prompts/get", {
		name: string(),
		arguments: record(string(), string()).optional(),
		...retryParamsShape
	});
	const ListResourcesRequestSchema$1 = wireRequest("resources/list", paginatedParamsShape);
	const ListResourceTemplatesRequestSchema$1 = wireRequest("resources/templates/list", paginatedParamsShape);
	const ReadResourceRequestSchema$1 = wireRequest("resources/read", {
		uri: string(),
		...retryParamsShape
	});
	const completeParamsShape = {
		ref: union([PromptReferenceSchema$1, ResourceTemplateReferenceSchema$1]),
		argument: object({
			name: string(),
			value: string()
		}),
		context: object({ arguments: record(string(), string()).optional() }).optional()
	};
	const CompleteRequestSchema$1 = wireRequest("completion/complete", completeParamsShape);
	const DiscoverRequestSchema$1 = wireRequest("server/discover", {});
	/** Anchor SubscriptionFilter (2026-only). */
	const SubscriptionFilterSchema$1 = object({
		toolsListChanged: boolean().optional(),
		promptsListChanged: boolean().optional(),
		resourcesListChanged: boolean().optional(),
		resourceSubscriptions: array(string()).optional()
	});
	const subscriptionsListenParamsShape = { notifications: SubscriptionFilterSchema$1 };
	const SubscriptionsListenRequestSchema$1 = wireRequest("subscriptions/listen", subscriptionsListenParamsShape);
	/**
	* Anchor SubscriptionsListenResultMetaObject — required subscriptionId stamp on
	* the graceful-close result. Extends `ResultMetaObject` since spec PR
	* #3002 (composed, so the serverInfo key and its leniency stay single-sourced).
	*/
	const SubscriptionsListenResultMetaSchema$1 = ResultMetaSchema.extend({ "io.modelcontextprotocol/subscriptionId": RequestIdSchema$1 });
	/**
	* Anchor SubscriptionsListenResult (2026-only). The empty `subscriptions/listen`
	* response signalling that the subscription has ended gracefully (server
	* shutdown). An abrupt transport close carries no response — the client treats
	* stream-close-without-result as a disconnect.
	*/
	const SubscriptionsListenResultSchema$1 = looseObject({
		_meta: SubscriptionsListenResultMetaSchema$1,
		resultType: ResultTypeSchema.default("complete")
	});
	/** Dispatch (post-lift) request schemas, keyed by method — registry-internal. */
	const dispatchRequestSchemas = {
		"tools/call": dispatchRequest("tools/call", callToolParamsShape),
		"tools/list": dispatchRequest("tools/list", paginatedParamsShape),
		"prompts/get": dispatchRequest("prompts/get", {
			name: string(),
			arguments: record(string(), string()).optional()
		}),
		"prompts/list": dispatchRequest("prompts/list", paginatedParamsShape),
		"resources/list": dispatchRequest("resources/list", paginatedParamsShape),
		"resources/templates/list": dispatchRequest("resources/templates/list", paginatedParamsShape),
		"resources/read": dispatchRequest("resources/read", { uri: string() }),
		"completion/complete": dispatchRequest("completion/complete", completeParamsShape),
		"server/discover": dispatchRequest("server/discover", {}),
		"subscriptions/listen": dispatchRequest("subscriptions/listen", subscriptionsListenParamsShape)
	};
	/** Dispatch (post-lift) result schemas, keyed by method — what the funnel
	* validates AFTER `decodeResult` consumed `resultType`. */
	function liftedResult(shape) {
		return looseObject({
			_meta: wireMeta,
			...shape
		});
	}
	const dispatchResultSchemas = {
		"tools/call": liftedResult({
			content: array(ContentBlockSchema$1),
			structuredContent: unknown().optional(),
			isError: boolean().optional()
		}),
		"tools/list": liftedResult({
			ttlMs: number$1().int().min(0),
			cacheScope: _enum(["public", "private"]),
			tools: array(ToolSchema$1),
			nextCursor: CursorSchema$1.optional()
		}),
		"prompts/get": liftedResult({
			description: string().optional(),
			messages: array(PromptMessageSchema$1)
		}),
		"prompts/list": liftedResult({
			ttlMs: number$1().int().min(0),
			cacheScope: _enum(["public", "private"]),
			prompts: array(PromptSchema$1),
			nextCursor: CursorSchema$1.optional()
		}),
		"resources/list": liftedResult({
			ttlMs: number$1().int().min(0),
			cacheScope: _enum(["public", "private"]),
			resources: array(ResourceSchema$1),
			nextCursor: CursorSchema$1.optional()
		}),
		"resources/templates/list": liftedResult({
			ttlMs: number$1().int().min(0),
			cacheScope: _enum(["public", "private"]),
			resourceTemplates: array(ResourceTemplateSchema$1),
			nextCursor: CursorSchema$1.optional()
		}),
		"resources/read": liftedResult({
			ttlMs: number$1().int().min(0),
			cacheScope: _enum(["public", "private"]),
			contents: array(union([TextResourceContentsSchema$1, BlobResourceContentsSchema$1]))
		}),
		"completion/complete": liftedResult({ completion: object({
			values: array(string()).max(100),
			total: number$1().int().optional(),
			hasMore: boolean().optional()
		}).loose() }),
		"server/discover": liftedResult({
			ttlMs: number$1().int().min(0).catch(0),
			cacheScope: _enum(["public", "private"]).catch("private"),
			supportedVersions: array(string()),
			capabilities: ServerCapabilities2026Schema,
			instructions: string().optional()
		}),
		"subscriptions/listen": liftedResult({})
	};
	/**
	* Notification `_meta` (anchor `NotificationMetaObject`): loose, with the
	* subscriptions/listen demux key typed when present. Only the anchor-exact
	* SHAPE is modeled here — listen delivery itself (filter gating, demux,
	* teardown) is #14 scope and not implemented by this module.
	*/
	const NotificationMetaSchema = looseObject({ "io.modelcontextprotocol/subscriptionId": RequestIdSchema$1.optional() });
	/** Anchor SubscriptionsAcknowledgedNotification (2026-only). */
	const SubscriptionsAcknowledgedNotificationSchema$1 = object({
		method: literal("notifications/subscriptions/acknowledged"),
		params: object({
			_meta: NotificationMetaSchema.optional(),
			notifications: SubscriptionFilterSchema$1
		})
	});
	/**
	* 2026-era `notifications/cancelled` params (anchor-exact fork): `requestId`
	* is REQUIRED on this revision — the shared schema keeps it optional because
	* the frozen 2025-11-25 shape declares it optional (task cancellation goes
	* through `tasks/cancel` there). Requiredness is bare because no 2025-era
	* traffic touches this module.
	*/
	const CancelledNotificationParamsSchema$1 = object({
		_meta: NotificationMetaSchema.optional(),
		requestId: RequestIdSchema$1,
		reason: string().optional()
	});
	/** 2026-era `notifications/cancelled` (see the params fork above). */
	const CancelledNotificationSchema$1 = object({
		method: literal("notifications/cancelled"),
		params: CancelledNotificationParamsSchema$1
	});
	const notificationSchemas2026 = {
		"notifications/cancelled": CancelledNotificationSchema$1,
		"notifications/progress": ProgressNotificationSchema$1,
		"notifications/message": LoggingMessageNotificationSchema$1,
		"notifications/resources/updated": ResourceUpdatedNotificationSchema$1,
		"notifications/resources/list_changed": ResourceListChangedNotificationSchema$1,
		"notifications/tools/list_changed": ToolListChangedNotificationSchema$1,
		"notifications/prompts/list_changed": PromptListChangedNotificationSchema$1,
		"notifications/subscriptions/acknowledged": SubscriptionsAcknowledgedNotificationSchema$1
	};
	const wireResultResponse = (result) => object({
		jsonrpc: literal("2.0"),
		id: union([string(), number$1().int()]),
		result
	}).strict();
	return {
		JSONValueSchema: JSONValueSchema$1,
		JSONObjectSchema: JSONObjectSchema$1,
		ProgressTokenSchema: ProgressTokenSchema$1,
		CursorSchema: CursorSchema$1,
		RequestIdSchema: RequestIdSchema$1,
		RoleSchema: RoleSchema$1,
		LoggingLevelSchema: LoggingLevelSchema$1,
		TaskMetadataSchema: TaskMetadataSchema$1,
		RelatedTaskMetadataSchema: RelatedTaskMetadataSchema$1,
		RequestMetaSchema: RequestMetaSchema$1,
		BaseRequestParamsSchema: BaseRequestParamsSchema$1,
		TaskAugmentedRequestParamsSchema: TaskAugmentedRequestParamsSchema$1,
		NotificationsParamsSchema: NotificationsParamsSchema$1,
		NotificationSchema: NotificationSchema$1,
		IconSchema: IconSchema$1,
		IconsSchema: IconsSchema$1,
		BaseMetadataSchema: BaseMetadataSchema$1,
		ImplementationSchema: ImplementationSchema$1,
		ClientTasksCapabilitySchema: ClientTasksCapabilitySchema$1,
		ServerTasksCapabilitySchema: ServerTasksCapabilitySchema$1,
		ClientCapabilitiesSchema: ClientCapabilitiesSchema$1,
		ServerCapabilitiesSchema: ServerCapabilitiesSchema$1,
		ProgressSchema: ProgressSchema$1,
		ProgressNotificationParamsSchema: ProgressNotificationParamsSchema$1,
		ProgressNotificationSchema: ProgressNotificationSchema$1,
		LoggingMessageNotificationParamsSchema: LoggingMessageNotificationParamsSchema$1,
		LoggingMessageNotificationSchema: LoggingMessageNotificationSchema$1,
		ResourceContentsSchema: ResourceContentsSchema$1,
		TextResourceContentsSchema: TextResourceContentsSchema$1,
		BlobResourceContentsSchema: BlobResourceContentsSchema$1,
		AnnotationsSchema: AnnotationsSchema$1,
		ResourceSchema: ResourceSchema$1,
		ResourceTemplateSchema: ResourceTemplateSchema$1,
		ResourceListChangedNotificationSchema: ResourceListChangedNotificationSchema$1,
		ResourceUpdatedNotificationParamsSchema: ResourceUpdatedNotificationParamsSchema$1,
		ResourceUpdatedNotificationSchema: ResourceUpdatedNotificationSchema$1,
		PromptArgumentSchema: PromptArgumentSchema$1,
		PromptSchema: PromptSchema$1,
		PromptListChangedNotificationSchema: PromptListChangedNotificationSchema$1,
		TextContentSchema: TextContentSchema$1,
		ImageContentSchema: ImageContentSchema$1,
		AudioContentSchema: AudioContentSchema$1,
		ToolUseContentSchema: ToolUseContentSchema$1,
		EmbeddedResourceSchema: EmbeddedResourceSchema$1,
		ResourceLinkSchema: ResourceLinkSchema$1,
		ContentBlockSchema: ContentBlockSchema$1,
		PromptMessageSchema: PromptMessageSchema$1,
		ToolAnnotationsSchema: ToolAnnotationsSchema$1,
		ToolListChangedNotificationSchema: ToolListChangedNotificationSchema$1,
		ModelHintSchema: ModelHintSchema$1,
		ModelPreferencesSchema: ModelPreferencesSchema$1,
		ToolChoiceSchema: ToolChoiceSchema$1,
		BooleanSchemaSchema: BooleanSchemaSchema$1,
		StringSchemaSchema: StringSchemaSchema$1,
		NumberSchemaSchema: NumberSchemaSchema$1,
		UntitledSingleSelectEnumSchemaSchema: UntitledSingleSelectEnumSchemaSchema$1,
		TitledSingleSelectEnumSchemaSchema: TitledSingleSelectEnumSchemaSchema$1,
		LegacyTitledEnumSchemaSchema: LegacyTitledEnumSchemaSchema$1,
		SingleSelectEnumSchemaSchema: SingleSelectEnumSchemaSchema$1,
		UntitledMultiSelectEnumSchemaSchema: UntitledMultiSelectEnumSchemaSchema$1,
		TitledMultiSelectEnumSchemaSchema: TitledMultiSelectEnumSchemaSchema$1,
		MultiSelectEnumSchemaSchema: MultiSelectEnumSchemaSchema$1,
		EnumSchemaSchema: EnumSchemaSchema$1,
		PrimitiveSchemaDefinitionSchema: PrimitiveSchemaDefinitionSchema$1,
		ElicitRequestFormParamsSchema: ElicitRequestFormParamsSchema$1,
		ResourceTemplateReferenceSchema: ResourceTemplateReferenceSchema$1,
		PromptReferenceSchema: PromptReferenceSchema$1,
		RootSchema: RootSchema$1,
		ClientCapabilities2026Schema,
		ServerCapabilities2026Schema,
		RequestMetaEnvelopeSchema,
		ToolSchema: ToolSchema$1,
		ToolResultContentSchema: ToolResultContentSchema$1,
		SamplingMessageContentBlockSchema: SamplingMessageContentBlockSchema$1,
		SamplingMessageSchema: SamplingMessageSchema$1,
		ResultTypeSchema,
		ResultMetaSchema,
		ResultSchema: ResultSchema$1,
		PaginatedResultSchema: PaginatedResultSchema$1,
		CallToolResultSchema: CallToolResultSchema$1,
		ListToolsResultSchema: ListToolsResultSchema$1,
		ListPromptsResultSchema: ListPromptsResultSchema$1,
		GetPromptResultSchema: GetPromptResultSchema$1,
		ListResourcesResultSchema: ListResourcesResultSchema$1,
		ListResourceTemplatesResultSchema: ListResourceTemplatesResultSchema$1,
		ReadResourceResultSchema: ReadResourceResultSchema$1,
		CompleteResultSchema: CompleteResultSchema$1,
		CacheableResultSchema,
		DiscoverResultSchema: DiscoverResultSchema$1,
		CreateMessageRequestParamsSchema: CreateMessageRequestParamsSchema$1,
		CreateMessageRequestSchema: CreateMessageRequestSchema$1,
		ListRootsRequestSchema: ListRootsRequestSchema$1,
		CreateMessageResultSchema: CreateMessageResultSchema$1,
		ListRootsResultSchema: ListRootsResultSchema$1,
		ElicitResultSchema: ElicitResultSchema$1,
		ElicitRequestURLParamsSchema: ElicitRequestURLParamsSchema$1,
		ElicitRequestParamsSchema: ElicitRequestParamsSchema$1,
		ElicitRequestSchema: ElicitRequestSchema$1,
		InputRequestSchema,
		InputResponseSchema,
		InputRequestsSchema,
		InputResponsesSchema,
		InputRequiredResultSchema,
		InputResponseRequestParamsSchema,
		CallToolRequestSchema: CallToolRequestSchema$1,
		ListToolsRequestSchema: ListToolsRequestSchema$1,
		ListPromptsRequestSchema: ListPromptsRequestSchema$1,
		GetPromptRequestSchema: GetPromptRequestSchema$1,
		ListResourcesRequestSchema: ListResourcesRequestSchema$1,
		ListResourceTemplatesRequestSchema: ListResourceTemplatesRequestSchema$1,
		ReadResourceRequestSchema: ReadResourceRequestSchema$1,
		CompleteRequestSchema: CompleteRequestSchema$1,
		DiscoverRequestSchema: DiscoverRequestSchema$1,
		SubscriptionFilterSchema: SubscriptionFilterSchema$1,
		SubscriptionsListenRequestSchema: SubscriptionsListenRequestSchema$1,
		SubscriptionsListenResultMetaSchema: SubscriptionsListenResultMetaSchema$1,
		SubscriptionsListenResultSchema: SubscriptionsListenResultSchema$1,
		dispatchRequestSchemas,
		dispatchResultSchemas,
		NotificationMetaSchema,
		SubscriptionsAcknowledgedNotificationSchema: SubscriptionsAcknowledgedNotificationSchema$1,
		CancelledNotificationParamsSchema: CancelledNotificationParamsSchema$1,
		CancelledNotificationSchema: CancelledNotificationSchema$1,
		notificationSchemas2026,
		JSONRPCResultResponseSchema: wireResultResponse(ResultSchema$1),
		CallToolResultResponseSchema: wireResultResponse(union([CallToolResultSchema$1, InputRequiredResultSchema])),
		ListToolsResultResponseSchema: wireResultResponse(ListToolsResultSchema$1),
		ListPromptsResultResponseSchema: wireResultResponse(ListPromptsResultSchema$1),
		GetPromptResultResponseSchema: wireResultResponse(union([GetPromptResultSchema$1, InputRequiredResultSchema])),
		ListResourcesResultResponseSchema: wireResultResponse(ListResourcesResultSchema$1),
		ListResourceTemplatesResultResponseSchema: wireResultResponse(ListResourceTemplatesResultSchema$1),
		ReadResourceResultResponseSchema: wireResultResponse(union([ReadResourceResultSchema$1, InputRequiredResultSchema])),
		CompleteResultResponseSchema: wireResultResponse(CompleteResultSchema$1),
		DiscoverResultResponseSchema: wireResultResponse(DiscoverResultSchema$1),
		SubscriptionsListenResultResponseSchema: wireResultResponse(SubscriptionsListenResultSchema$1)
	};
}
let memo;
/**
* Builds the era wire-schema set on first call and returns the same object
* thereafter. Module evaluation stays construction-free so importing the
* era codec/registry costs nothing until the first validation actually
* needs a schema; the registry, the codec, and the eager `schemas.ts`
* shim all pull through this memo, so reference identity holds across
* every consumer.
*/
function buildSchemas2026() {
	return memo ??= build();
}
/**
* The operations whose results are cacheable on the 2026-07-28 revision (the
* `CacheableResult` extenders). This list is closed: no other operation's
* result ever receives cache fields from the SDK.
*/
const CACHEABLE_RESULT_METHODS = [
	"tools/list",
	"prompts/list",
	"resources/list",
	"resources/templates/list",
	"resources/read",
	"server/discover"
];
/** Whether the given method's result is cacheable on the 2026-07-28 revision. */
function isCacheableResultMethod(method) {
	return CACHEABLE_RESULT_METHODS.includes(method);
}
/**
* The symbol-keyed carrier for a configured cache hint on a result object.
* Symbol properties are invisible to JSON serialization, so the carrier can be
* attached era-blind: only the 2026-era encode seam consumes it.
*/
const RESULT_CACHE_HINT_FALLBACK = Symbol("modelcontextprotocol.resultCacheHintFallback");
/**
* Attaches a configured cache hint to a result as the encode-time fallback.
* Returns the result unchanged when there is nothing to attach. When a more
* specific hint is already attached, the two hints are combined per field
* (most-specific-author-wins for each of `ttlMs` and `cacheScope`): the
* per-registration hint attached by the feature layer keeps every field it
* sets, and the server-level per-operation hint only fills the fields the
* more specific hint leaves unset.
*/
function attachCacheHintFallback(result, hint) {
	if (hint === void 0) return result;
	const attached = result[RESULT_CACHE_HINT_FALLBACK];
	if (attached === void 0) return {
		...result,
		[RESULT_CACHE_HINT_FALLBACK]: hint
	};
	const merged = {};
	const ttlMs = attached.ttlMs ?? hint.ttlMs;
	if (ttlMs !== void 0) merged.ttlMs = ttlMs;
	const cacheScope = attached.cacheScope ?? hint.cacheScope;
	if (cacheScope !== void 0) merged.cacheScope = cacheScope;
	return {
		...result,
		[RESULT_CACHE_HINT_FALLBACK]: merged
	};
}
/** Reads the configured cache-hint fallback attached to a result, if any. */
function cacheHintFallbackOf(result) {
	return result[RESULT_CACHE_HINT_FALLBACK];
}
/**
* Whether a value is a valid `ttlMs`: a non-negative safe integer. Safe
* integers are required because the wire schemas validate `ttlMs` as an
* integer within `Number.MIN_SAFE_INTEGER`/`Number.MAX_SAFE_INTEGER`; a value
* outside that range is treated as invalid here so it falls through to the
* next author instead of being emitted and rejected downstream.
*/
function isValidCacheTtlMs(value) {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
/** Whether a value is a valid `cacheScope`. */
function isValidCacheScope(value) {
	return value === "public" || value === "private";
}
/**
* Validates a configured cache hint at configuration time. Throws a
* `RangeError` naming the offending field, so misconfiguration fails at
* startup/registration rather than silently degrading at encode time.
*/
function assertValidCacheHint(hint, context) {
	if (hint.ttlMs !== void 0 && !isValidCacheTtlMs(hint.ttlMs)) throw new RangeError(`Invalid cache hint for ${context}: ttlMs must be a non-negative safe integer (got ${String(hint.ttlMs)})`);
	if (hint.cacheScope !== void 0 && !isValidCacheScope(hint.cacheScope)) throw new RangeError(`Invalid cache hint for ${context}: cacheScope must be 'public' or 'private' (got ${String(hint.cacheScope)})`);
}
/**
* Error codes for protocol errors that cross the wire as JSON-RPC error responses.
* These follow the JSON-RPC specification and MCP-specific extensions.
*/
let ProtocolErrorCode = /* @__PURE__ */ function(ProtocolErrorCode$1) {
	ProtocolErrorCode$1[ProtocolErrorCode$1["ParseError"] = -32700] = "ParseError";
	ProtocolErrorCode$1[ProtocolErrorCode$1["InvalidRequest"] = -32600] = "InvalidRequest";
	ProtocolErrorCode$1[ProtocolErrorCode$1["MethodNotFound"] = -32601] = "MethodNotFound";
	ProtocolErrorCode$1[ProtocolErrorCode$1["InvalidParams"] = -32602] = "InvalidParams";
	ProtocolErrorCode$1[ProtocolErrorCode$1["InternalError"] = -32603] = "InternalError";
	/**
	* Resource not found.
	*
	* Receive-tolerated only: the SDK never EMITS `-32002` — `resources/read`
	* misses answer `-32602` (Invalid Params) on every protocol revision per
	* the 2026-07-28 spec MUST, and a handler-thrown `-32002` is mapped to
	* `-32602` at the era encode seam. The member stays importable so clients
	* can recognise `-32002` from peers built on earlier SDK releases (the
	* spec's "clients SHOULD also accept `-32002`" backwards-compatibility
	* clause). Throw `ResourceNotFoundError` instead.
	*/
	ProtocolErrorCode$1[ProtocolErrorCode$1["ResourceNotFound"] = -32002] = "ResourceNotFound";
	/**
	* Processing the request requires a capability the client did not declare
	* in the request's `clientCapabilities` (protocol revision 2026-07-28).
	*/
	ProtocolErrorCode$1[ProtocolErrorCode$1["MissingRequiredClientCapability"] = -32021] = "MissingRequiredClientCapability";
	/**
	* The request's protocol version is unknown to the server or unsupported
	* by it (protocol revision 2026-07-28).
	*/
	ProtocolErrorCode$1[ProtocolErrorCode$1["UnsupportedProtocolVersion"] = -32022] = "UnsupportedProtocolVersion";
	ProtocolErrorCode$1[ProtocolErrorCode$1["UrlElicitationRequired"] = -32042] = "UrlElicitationRequired";
	return ProtocolErrorCode$1;
}({});
/**
* Protocol errors are JSON-RPC errors that cross the wire as error responses.
* They use numeric error codes from the {@linkcode ProtocolErrorCode} enum.
*
* `instanceof` on this class (and its subclasses) is brand-matched, so it works
* across separately bundled copies of the SDK — e.g. an error constructed by
* `@modelcontextprotocol/client` matches the class re-exported by
* `@modelcontextprotocol/server` in the same process.
*/
var ProtocolError = class ProtocolError extends Error {
	static {
		Object.defineProperty(this, "mcpBrand", { value: "mcp.ProtocolError" });
	}
	static [Symbol.hasInstance](value) {
		return brandedHasInstance(this, value);
	}
	/**
	* Brand-based type guard: equivalent to `value instanceof this`, as an
	* explicit static predicate (the axios/AWS-SDK `isInstance` style). Reads
	* the caller's own brand via `this`, so every branded subclass gets a
	* correctly-scoped guard by inheritance. Must be invoked on the class —
	* in callback position write `v => SdkError.isInstance(v)`, not
	* `.filter(SdkError.isInstance)` (detached calls throw rather than
	* silently matching nothing).
	*/
	static isInstance(value) {
		if (typeof this !== "function") throw new TypeError("isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`");
		return brandedHasInstance(this, value);
	}
	constructor(code, message, data) {
		super(message);
		this.code = code;
		this.data = data;
		this.name = "ProtocolError";
		stampErrorBrands(this, new.target);
	}
	/**
	* Factory method to create the appropriate error type based on the error code and data
	*/
	static fromError(code, message, data) {
		if (code === ProtocolErrorCode.UrlElicitationRequired && data) {
			const errorData = data;
			if (errorData.elicitations) return new UrlElicitationRequiredError(errorData.elicitations, message);
		}
		if (code === ProtocolErrorCode.UnsupportedProtocolVersion && data) {
			const errorData = data;
			if (Array.isArray(errorData.supported) && typeof errorData.requested === "string") return new UnsupportedProtocolVersionError({
				supported: errorData.supported,
				requested: errorData.requested
			}, message);
		}
		if (code === ProtocolErrorCode.InvalidParams || code === ProtocolErrorCode.ResourceNotFound) {
			const errorData = data;
			if (typeof errorData?.uri === "string" && (code === ProtocolErrorCode.ResourceNotFound || Object.keys(errorData).length === 1)) return new ResourceNotFoundError(errorData.uri, message);
		}
		if (code === ProtocolErrorCode.MissingRequiredClientCapability && data) {
			const errorData = data;
			if (errorData.requiredCapabilities !== null && typeof errorData.requiredCapabilities === "object" && !Array.isArray(errorData.requiredCapabilities)) return new MissingRequiredClientCapabilityError({ requiredCapabilities: errorData.requiredCapabilities }, message);
		}
		return new ProtocolError(code, message, data);
	}
};
/**
* Error type for a `resources/read` miss: the requested resource does not
* exist. The wire code is `-32602` (Invalid Params) on every protocol
* revision — the spec MUST for revision 2026-07-28, and the value the v1.x
* SDK has always emitted on earlier revisions. The error data echoes the
* requested URI.
*
* Recognise this error by checking `error.data` is exactly `{ uri: string }`
* (a `-32602` whose data carries `uri` and nothing else is resource-not-found;
* any other `-32602` is an ordinary Invalid Params). For backwards compatibility, clients should also
* accept `-32002` as resource not found — earlier SDK builds emitted that
* code, and {@linkcode ProtocolError.fromError} reconstructs this class for
* either code **when `error.data` carries `uri`** (a bare `-32002` without
* `data.uri` stays a generic {@linkcode ProtocolError}). `instanceof` checks
* are brand-matched and work across separately bundled copies of the SDK.
*/
var ResourceNotFoundError = class extends ProtocolError {
	static {
		Object.defineProperty(this, "mcpBrand", { value: "mcp.ResourceNotFoundError" });
	}
	constructor(uri, message = `Resource not found: ${uri}`) {
		super(ProtocolErrorCode.InvalidParams, message, { uri });
	}
	/** The URI that was requested and not found. */
	get uri() {
		return this.data.uri;
	}
};
/**
* Specialized error type when a tool requires a URL mode elicitation.
* This makes it nicer for the client to handle since there is specific data to work with instead of just a code to check against.
*/
var UrlElicitationRequiredError = class extends ProtocolError {
	static {
		Object.defineProperty(this, "mcpBrand", { value: "mcp.UrlElicitationRequiredError" });
	}
	constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
		super(ProtocolErrorCode.UrlElicitationRequired, message, { elicitations });
	}
	get elicitations() {
		return this.data?.elicitations ?? [];
	}
};
/**
* Error type for the `-32022` UnsupportedProtocolVersion protocol error (protocol
* revision 2026-07-28): the request's protocol version is unknown to the server or
* unsupported by it.
*
* The error data lists the protocol versions the receiver supports (`supported`),
* so the sender can choose a mutually supported version and retry, and echoes the
* version that was requested (`requested`).
*/
var UnsupportedProtocolVersionError = class extends ProtocolError {
	static {
		Object.defineProperty(this, "mcpBrand", { value: "mcp.UnsupportedProtocolVersionError" });
	}
	constructor(data, message = `Unsupported protocol version: ${data.requested}`) {
		super(ProtocolErrorCode.UnsupportedProtocolVersion, message, data);
	}
	/**
	* Protocol versions the receiver supports.
	*/
	get supported() {
		return this.data.supported;
	}
	/**
	* The protocol version that was requested.
	*/
	get requested() {
		return this.data.requested;
	}
};
/**
* Error type for the `-32021` MissingRequiredClientCapability protocol error
* (protocol revision 2026-07-28): processing the request requires a capability
* the client did not declare in the request's `clientCapabilities`.
*
* The error data lists the missing capabilities (`requiredCapabilities`) in
* the `ClientCapabilities` shape, so the client can see exactly what it would
* have to declare for the request to be served. On HTTP, the response status
* is `400 Bad Request`.
*
* Recognize this error by its code and `data.requiredCapabilities`, or by
* `instanceof` — checks are brand-matched and work across separately bundled
* copies of the SDK.
*/
var MissingRequiredClientCapabilityError = class extends ProtocolError {
	static {
		Object.defineProperty(this, "mcpBrand", { value: "mcp.MissingRequiredClientCapabilityError" });
	}
	constructor(data, message = `Missing required client capabilities: ${Object.keys(data.requiredCapabilities).join(", ")}`) {
		super(ProtocolErrorCode.MissingRequiredClientCapability, message, data);
	}
	/**
	* The capabilities the server requires from the client to process the
	* request (only the missing capabilities are listed).
	*/
	get requiredCapabilities() {
		return this.data.requiredCapabilities;
	}
};
/** The default cache policy when neither the handler nor configuration provides one. */
const DEFAULT_CACHE_TTL_MS = 0;
const DEFAULT_CACHE_SCOPE = "private";
/**
* Request methods whose spec result vocabulary goes beyond `'complete'` on the
* 2026-07-28 revision: their results may be `input_required` (multi
* round-trip requests), so a handler-provided `resultType` passes through the
* stamp untouched. `subscriptions/listen` is NOT in this set: it never emits
* a JSON-RPC result — termination is stream close (HTTP) or
* `notifications/cancelled` (stdio) per the spec.
*/
const EXTENDED_RESULT_TYPE_METHODS = [
	"tools/call",
	"prompts/get",
	"resources/read"
];
/**
* Step 1 of the encode contract: ensure the outbound result carries the
* required `resultType` discriminator.
*
* - No handler-provided value → stamp `'complete'`.
* - Handler-provided `'complete'` → kept as-is.
* - Handler-provided non-`'complete'` value on a method whose vocabulary
*   allows it ({@linkcode EXTENDED_RESULT_TYPE_METHODS}) → passes through.
*   The value is forwarded verbatim — the wire vocabulary is an open union and
*   the SDK does not validate the string, so emitting a `resultType` the
*   negotiated revision does not define is the handler author's
*   responsibility.
* - Handler-provided non-`'complete'` value on any other method → internal
*   error (loud): the value would be mis-typed on the wire, and silently
*   rewriting it would hide a server bug.
*/
function stampResultType(method, result) {
	const provided = result["resultType"];
	if (provided === void 0) return {
		...result,
		resultType: "complete"
	};
	if (provided === "complete") return result;
	if (EXTENDED_RESULT_TYPE_METHODS.includes(method)) return result;
	throw new ProtocolError(ProtocolErrorCode.InternalError, `Handler for ${method} returned resultType '${String(provided)}', but results of ${method} only support 'complete' on protocol revision 2026-07-28`);
}
/**
* Step 2 of the encode contract: fill the required `ttlMs`/`cacheScope` fields
* on cacheable results.
*
* Applies only when the (post-stamp) `resultType` is `'complete'` and the
* method is one of the cacheable operations; everything else is returned
* untouched apart from removing the configured-hint carrier. Field resolution
* is per field, most specific author first: a valid handler-returned value,
* then the configured cache hint attached by the server layer, then the
* defaults. Handler-returned values are validated at encode time (`ttlMs`
* must be a non-negative integer, `cacheScope` must be `'public'` or
* `'private'`); invalid values are ignored rather than emitted.
*/
function fillCacheFields(method, result) {
	const fallback = cacheHintFallbackOf(result);
	if (result["resultType"] !== "complete" || !isCacheableResultMethod(method)) return fallback === void 0 ? result : stripCacheHintFallback(result);
	const provided = result;
	const ttlMs = isValidCacheTtlMs(provided["ttlMs"]) ? provided["ttlMs"] : resolveTtlMs(fallback);
	const cacheScope = isValidCacheScope(provided["cacheScope"]) ? provided["cacheScope"] : resolveCacheScope(fallback);
	const filled = {
		...provided,
		ttlMs,
		cacheScope
	};
	delete filled[RESULT_CACHE_HINT_FALLBACK];
	return filled;
}
function isPlainObject$5(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
/**
* Step 3 of the encode contract: stamp the server's identity into the
* result's `_meta` under `io.modelcontextprotocol/serverInfo` (spec PR #3002:
* servers SHOULD include it on every response).
*
* - No `serverInfo` supplied (a client instance, or a hand-constructed
*   protocol object) → identity function.
* - The result's `_meta` already carries the key → kept as-is (the handler
*   is the more specific author; mirrors the cache-fill resolution order).
* - A present-but-non-object `_meta` (a dynamic-caller bug) → kept as-is:
*   the stamp never rewrites handler material, and the malformed value fails
*   loudly at the peer instead of being silently replaced here.
* - Otherwise → the key is added, preserving any other `_meta` entries.
*
* Runs for every result regardless of `resultType`: the anchor types
* `Result._meta` as `ResultMetaObject` on all results, `input_required`
* included.
*/
function stampServerInfoMeta(result, serverInfo) {
	if (serverInfo === void 0) return result;
	const meta = result["_meta"];
	if (meta === void 0) return {
		...result,
		_meta: { [SERVER_INFO_META_KEY]: serverInfo }
	};
	if (!isPlainObject$5(meta)) return result;
	if (meta["io.modelcontextprotocol/serverInfo"] !== void 0) return result;
	return {
		...result,
		_meta: {
			...meta,
			[SERVER_INFO_META_KEY]: serverInfo
		}
	};
}
function resolveTtlMs(fallback) {
	return fallback !== void 0 && isValidCacheTtlMs(fallback.ttlMs) ? fallback.ttlMs : DEFAULT_CACHE_TTL_MS;
}
function resolveCacheScope(fallback) {
	return fallback !== void 0 && isValidCacheScope(fallback.cacheScope) ? fallback.cacheScope : DEFAULT_CACHE_SCOPE;
}
function stripCacheHintFallback(result) {
	const copy = { ...result };
	delete copy[RESULT_CACHE_HINT_FALLBACK];
	return copy;
}
/**
* In-band input-request vocabulary of the 2026-07-28 revision (SEP-2322
* multi round-trip requests), dispatch view.
*
* The three former server→client wire requests (`elicitation/create`,
* `sampling/createMessage`, `roots/list`) are NOT wire request methods on
* this revision — they are demoted to de-JSON-RPC'd payloads embedded in an
* `input_required` result. The multi-round-trip driver dispatches those
* embedded payloads to the client's registered handlers through the normal
* handler machinery, and these are the schemas that dispatch parses them
* with: lenient where the anchor's wire-true artifacts are strict (an
* embedded request never carries the per-request `_meta` envelope), exact
* where the vocabulary forks (the sampling shapes compose the forked
* SamplingMessage/Tool payloads).
*
* Registry membership is intentionally NOT granted here — these methods stay
* absent from the 2026-era request registry (a peer sending one as a wire
* request still gets −32601 by absence). Only the codec's
* `inputRequestSchema`/`inputResponseSchema` accessors expose them.
*/
/** The embedded input-request methods of the 2026-07-28 revision. */
const INPUT_REQUEST_METHODS_2026 = [
	"elicitation/create",
	"sampling/createMessage",
	"roots/list"
];
let maps;
function inputSchemaMaps() {
	if (maps) return maps;
	const s = buildSchemas2026();
	maps = {
		request: {
			"elicitation/create": object({
				method: literal("elicitation/create"),
				params: s.ElicitRequestParamsSchema
			}),
			"sampling/createMessage": object({
				method: literal("sampling/createMessage"),
				params: s.CreateMessageRequestParamsSchema
			}),
			"roots/list": object({
				method: literal("roots/list"),
				params: looseObject({}).optional()
			})
		},
		response: {
			"elicitation/create": s.ElicitResultSchema,
			"sampling/createMessage": s.CreateMessageResultSchema,
			"roots/list": s.ListRootsResultSchema
		}
	};
	return maps;
}
function isInputRequestMethod2026(method) {
	return INPUT_REQUEST_METHODS_2026.includes(method);
}
function getInputRequestSchema2026(method) {
	return isInputRequestMethod2026(method) ? inputSchemaMaps().request[method] : void 0;
}
function getInputResponseSchema2026(method) {
	return isInputRequestMethod2026(method) ? inputSchemaMaps().response[method] : void 0;
}
const requestMethodKeys = {
	"tools/call": null,
	"tools/list": null,
	"prompts/get": null,
	"prompts/list": null,
	"resources/list": null,
	"resources/templates/list": null,
	"resources/read": null,
	"completion/complete": null,
	"server/discover": null,
	"subscriptions/listen": null
};
const notificationMethodKeys = {
	"notifications/cancelled": null,
	"notifications/progress": null,
	"notifications/message": null,
	"notifications/resources/updated": null,
	"notifications/resources/list_changed": null,
	"notifications/tools/list_changed": null,
	"notifications/prompts/list_changed": null,
	"notifications/subscriptions/acknowledged": null
};
/** The 2026-era request-method set (registry membership = the deletion story). */
function hasRequestMethod2026(method) {
	return Object.prototype.hasOwnProperty.call(requestMethodKeys, method);
}
/** The 2026-era notification-method set. */
function hasNotificationMethod2026(method) {
	return Object.prototype.hasOwnProperty.call(notificationMethodKeys, method);
}
/** Result-map membership (same key set as the request map on this era). */
function hasResultMethod2026(method) {
	return Object.prototype.hasOwnProperty.call(requestMethodKeys, method);
}
function getRequestSchema2026(method) {
	return hasRequestMethod2026(method) ? buildSchemas2026().dispatchRequestSchemas[method] : void 0;
}
function getResultSchema2026(method) {
	return hasResultMethod2026(method) ? buildSchemas2026().dispatchResultSchemas[method] : void 0;
}
function getNotificationSchema2026(method) {
	return hasNotificationMethod2026(method) ? buildSchemas2026().notificationSchemas2026[method] : void 0;
}
Object.keys(requestMethodKeys);
Object.keys(notificationMethodKeys);
function isPlainObject$4(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** Tri-state wrap of an optional Zod schema lookup (the function-only contract). */
function triState(schema, raw) {
	if (schema === void 0) return {
		ok: false,
		reason: "not-in-era"
	};
	const parsed = schema.safeParse(raw);
	return parsed.success ? {
		ok: true,
		value: parsed.data
	} : {
		ok: false,
		reason: "invalid",
		message: String(parsed.error)
	};
}
const NOT_IN_ERA = {
	ok: false,
	reason: "not-in-era"
};
/**
* The reserved `_meta` keys an envelope must carry on this era (in reporting
* order). `clientInfo` is NOT here: spec PR #3002 demoted it to SHOULD, so a
* request without it is accepted (a present-but-malformed value still fails
* the envelope schema parse below).
*/
const REQUIRED_ENVELOPE_KEYS = [PROTOCOL_VERSION_META_KEY, CLIENT_CAPABILITIES_META_KEY];
/** Strip the known deleted-field set from an outbound result (Q1-SD3 iii). */
function enforceDeletedFields(method, result) {
	let next = result;
	let copied = false;
	const copy = () => {
		if (!copied) {
			next = { ...next };
			copied = true;
		}
		return next;
	};
	const tools = result.tools;
	if (method === "tools/list" && Array.isArray(tools) && tools.some((tool) => isPlainObject$4(tool) && "execution" in tool)) copy().tools = tools.map((tool) => {
		if (!isPlainObject$4(tool) || !("execution" in tool)) return tool;
		const rest = { ...tool };
		delete rest["execution"];
		return rest;
	});
	const capabilities = result.capabilities;
	if (isPlainObject$4(capabilities) && "tasks" in capabilities) {
		const rest = { ...capabilities };
		delete rest["tasks"];
		copy().capabilities = rest;
	}
	return next;
}
const rev2026Codec = {
	era: "2026-07-28",
	hasRequestMethod: hasRequestMethod2026,
	hasNotificationMethod: hasNotificationMethod2026,
	hasInputRequestMethod: (method) => getInputRequestSchema2026(method) !== void 0,
	validateRequest: (method, raw) => triState(getRequestSchema2026(method), raw),
	validateResult: (method, raw) => triState(getResultSchema2026(method), raw),
	validateNotification: (method, raw) => triState(getNotificationSchema2026(method), raw),
	validateInputRequest: (method, raw) => triState(getInputRequestSchema2026(method), raw),
	validateInputResponse: (method, raw) => triState(getInputResponseSchema2026(method), raw),
	samplingResultVariant: () => NOT_IN_ERA,
	outboundEnvelope(material) {
		return {
			[PROTOCOL_VERSION_META_KEY]: material.protocolVersion,
			[CLIENT_INFO_META_KEY]: material.clientInfo,
			[CLIENT_CAPABILITIES_META_KEY]: material.clientCapabilities,
			...material.logLevel !== void 0 && { ["io.modelcontextprotocol/logLevel"]: material.logLevel }
		};
	},
	validateEnvelopeMeta(meta) {
		const issues = [];
		for (const key of REQUIRED_ENVELOPE_KEYS) if (!(key in meta)) issues.push({
			key,
			problem: "missing"
		});
		const parsed = buildSchemas2026().RequestMetaEnvelopeSchema.safeParse(meta);
		if (!parsed.success) for (const issue of parsed.error.issues) {
			const path = issue.path.map(String);
			const key = path.length > 0 ? path.join(".") : "_meta";
			if (path.length === 1 && issues.some((existing) => existing.key === key && existing.problem === "missing")) continue;
			issues.push({
				key,
				problem: issue.message
			});
		}
		return issues;
	},
	projectCallToolResult: (result) => appendTextFallbackForNonObject(result),
	inputRequestSchema: getInputRequestSchema2026,
	decodeResult(method, raw) {
		if (!isPlainObject$4(raw)) return {
			kind: "invalid",
			error: new SdkError(SdkErrorCode.InvalidResult, `Invalid result for ${method}: not an object`, { method })
		};
		const rawResultType = raw["resultType"];
		if (rawResultType === void 0) return {
			kind: "invalid",
			error: new SdkError(SdkErrorCode.InvalidResult, `Invalid result for ${method}: missing required resultType — servers implementing protocol revision 2026-07-28 MUST include it (the absent-means-complete bridge applies only to earlier-revision servers)`, {
				method,
				violation: "missing-resultType"
			})
		};
		if (typeof rawResultType !== "string") return {
			kind: "invalid",
			error: new SdkError(SdkErrorCode.InvalidResult, `Invalid result for ${method}: non-string resultType`, {
				method,
				resultType: rawResultType
			})
		};
		if (rawResultType === "input_required") {
			const rawInputRequests = raw["inputRequests"];
			const inputRequests = isPlainObject$4(rawInputRequests) ? rawInputRequests : {};
			const requestState = raw["requestState"];
			const metaParse = raw["_meta"] === void 0 ? void 0 : buildSchemas2026().ResultMetaSchema.safeParse(raw["_meta"]);
			const meta = metaParse?.success ? metaParse.data : void 0;
			if (Object.keys(inputRequests).length === 0 && typeof requestState !== "string") return {
				kind: "invalid",
				error: new SdkError(SdkErrorCode.InvalidResult, `Invalid result for ${method}: input_required carries neither inputRequests nor requestState (every input_required result must include at least one of the two)`, {
					method,
					violation: "input-required-missing-both"
				})
			};
			return {
				kind: "input_required",
				inputRequests,
				...typeof requestState === "string" && { requestState },
				...meta !== void 0 && { _meta: meta }
			};
		}
		if (rawResultType !== "complete") return {
			kind: "invalid",
			error: new SdkError(SdkErrorCode.UnsupportedResultType, `Unsupported result type '${rawResultType}' for ${method}`, {
				resultType: rawResultType,
				method
			})
		};
		const wireResultSchemas = getWireResultSchemas();
		const wireSchema = Object.hasOwn(wireResultSchemas, method) ? wireResultSchemas[method] : void 0;
		if (wireSchema !== void 0) {
			const parsed = wireSchema.safeParse(raw);
			if (!parsed.success) return {
				kind: "invalid",
				error: new SdkError(SdkErrorCode.InvalidResult, `Invalid result for ${method}: ${parsed.error}`, { method })
			};
		}
		const lifted = { ...raw };
		delete lifted["resultType"];
		return {
			kind: "complete",
			result: lifted
		};
	},
	encodeResult(method, result, serverInfo) {
		return stampServerInfoMeta(fillCacheFields(method, stampResultType(method, enforceDeletedFields(method, result))), serverInfo);
	},
	encodeErrorCode: (code) => code === -32002 ? -32602 : code,
	checkInboundEnvelope(material) {
		if (material.envelope === void 0) return "Request is missing the required _meta envelope for protocol revision 2026-07-28 (io.modelcontextprotocol/protocolVersion, io.modelcontextprotocol/clientCapabilities)";
		const parsed = buildSchemas2026().RequestMetaEnvelopeSchema.safeParse(material.envelope);
		if (!parsed.success) return `Invalid _meta envelope for protocol revision 2026-07-28: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`;
	}
};
/** Wire-true result wrappers consulted by decode step 2, keyed by method —
* built once through the era's schema memo on the first decode. */
let wireResultSchemasMemo;
function getWireResultSchemas() {
	if (wireResultSchemasMemo) return wireResultSchemasMemo;
	const s = buildSchemas2026();
	wireResultSchemasMemo = {
		"tools/call": s.CallToolResultSchema,
		"tools/list": s.ListToolsResultSchema,
		"prompts/get": s.GetPromptResultSchema,
		"prompts/list": s.ListPromptsResultSchema,
		"resources/list": s.ListResourcesResultSchema,
		"resources/templates/list": s.ListResourceTemplatesResultSchema,
		"resources/read": s.ReadResourceResultSchema,
		"completion/complete": s.CompleteResultSchema,
		"server/discover": s.DiscoverResultSchema
	};
	return wireResultSchemasMemo;
}
/**
* The modern wire revision literal. Internal only — deliberately NOT a public
* constant (G-D2-4: no public modern-version constant ships before era-aware
* list semantics exist).
*/
const MODERN_WIRE_REVISION = "2026-07-28";
/**
* Era resolution, many-to-one (Q1-SD1): every modern-era revision
* (`>= 2026-07-28`) → the 2026-era codec; every legacy revision (the five
* `SUPPORTED_PROTOCOL_VERSIONS`) and `undefined`/unknown → the 2025-era
* codec (the DV-13 default posture — hand-constructed instances and
* unclassified traffic are legacy-era). This is the same era predicate the
* rest of the SDK uses ({@link isModernProtocolVersion}); a pinned modern
* revision other than the literal '2026-07-28' must still resolve modern.
*/
function codecForVersion(version) {
	return version !== void 0 && isModernProtocolVersion(version) ? rev2026Codec : rev2025Codec;
}
/**
* The wire era an edge classification names (Q2 — produced at the
* transport/entry edge; this layer only CONSUMES it). The dispatch funnel no
* longer resolves a codec FROM the classification: era is instance state, and
* a classified inbound message is VALIDATED against the instance era — a
* mismatch is an entry/routing error, never a per-message era switch. The
* exact `revision` wins over the coarse era flag when both are present.
*/
function classifiedWireEra(classification) {
	if (classification.revision !== void 0) return codecForVersion(classification.revision).era;
	return classification.era === "modern" ? rev2026Codec.era : rev2025Codec.era;
}
/**
* The derived spec-method universe: the union of every codec registry. A
* method in this set is era-gated at dispatch and send time; a method outside
* it is a consumer-owned extension method (era-blind, schema-explicit).
* Derived from the registries — never hand-curated (the LEGACY_ONLY_METHODS
* table class is exactly what registry membership replaces).
*/
function isSpecRequestMethod(method) {
	return ALL_CODECS.some((codec) => codec.hasRequestMethod(method));
}
function isSpecNotificationMethod(method) {
	return ALL_CODECS.some((codec) => codec.hasNotificationMethod(method));
}
/** The names SEP-2663 re-defines for the Tasks extension on the era that removed them from core. */
function isExtensionReusedRequestMethod(method) {
	return method === "tasks/get" || method === "tasks/cancel";
}
const ALL_CODECS = [rev2025Codec, rev2026Codec];
/**
* Per-request `_meta` envelope claim helpers (protocol revision 2026-07-28).
*
* Pure, value-returning helpers used by the inbound HTTP classifier
* (`classifyInboundRequest`): claim detection and envelope validation with
* self-identifying issues. The envelope schema itself stays the wire layer's
* single source of truth (`RequestMetaEnvelopeSchema`); this module only maps
* its outcomes into the shapes the validation ladder emits.
*
* Claim detection is deliberately narrow: a message claims the 2026-07-28
* envelope mechanism if and only if the reserved protocol-version `_meta` key
* is present in `params._meta`. Other reserved keys (client info, client
* capabilities, log level), a bare `progressToken`, or unrelated keys under
* the `io.modelcontextprotocol/` prefix do NOT constitute a claim on their
* own — but once the claim key is present, a malformed envelope is a
* validation error, never a silent fall back to legacy handling.
*
* The wire-exact envelope schema, the required-key set, and the per-key issue
* mapping live in the wire layer (the 2026-era codec's `validateEnvelopeMeta`).
* This module never reaches into a per-revision wire module directly.
*/
function isPlainObject$3(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** The `_meta` object of a message's params, when present. */
function requestMetaOf(params) {
	if (!isPlainObject$3(params)) return void 0;
	const meta = params["_meta"];
	return isPlainObject$3(meta) ? meta : void 0;
}
/**
* Whether a message's params carry the per-request envelope claim: the
* reserved protocol-version `_meta` key is present (regardless of whether the
* rest of the envelope is valid — validation is a separate, later step).
*/
function hasEnvelopeClaim(params) {
	const meta = requestMetaOf(params);
	return meta !== void 0 && "io.modelcontextprotocol/protocolVersion" in meta;
}
/**
* The protocol version named by a message's envelope claim, when the claim is
* present and carries a string value. A present claim with a non-string value
* still counts as a claim ({@linkcode hasEnvelopeClaim}); it surfaces as a
* validation issue instead of a version.
*/
function envelopeClaimVersion(params) {
	const value = requestMetaOf(params)?.[PROTOCOL_VERSION_META_KEY];
	return typeof value === "string" ? value : void 0;
}
/**
* Validates a request's `_meta` object as a 2026-07-28 per-request envelope
* and reports problems as self-identifying issues (which key, what problem).
*
* Returns an empty array when the envelope is valid. Missing required keys are
* reported first (as `problem: 'missing'`), then schema violations inside
* present keys, in a stable order.
*/
function validateEnvelopeMeta(meta) {
	return codecForVersion(MODERN_WIRE_REVISION).validateEnvelopeMeta(meta);
}
var schemas_exports = /* @__PURE__ */ __exportAll({
	AnnotationsSchema: () => AnnotationsSchema,
	AudioContentSchema: () => AudioContentSchema,
	BaseMetadataSchema: () => BaseMetadataSchema,
	BaseRequestParamsSchema: () => BaseRequestParamsSchema,
	BlobResourceContentsSchema: () => BlobResourceContentsSchema,
	BooleanSchemaSchema: () => BooleanSchemaSchema,
	CallToolRequestParamsSchema: () => CallToolRequestParamsSchema,
	CallToolRequestSchema: () => CallToolRequestSchema,
	CallToolResultSchema: () => CallToolResultSchema,
	CancelTaskRequestSchema: () => CancelTaskRequestSchema,
	CancelTaskResultSchema: () => CancelTaskResultSchema,
	CancelledNotificationParamsSchema: () => CancelledNotificationParamsSchema,
	CancelledNotificationSchema: () => CancelledNotificationSchema,
	ClientCapabilitiesSchema: () => ClientCapabilitiesSchema,
	ClientNotificationSchema: () => ClientNotificationSchema,
	ClientRequestSchema: () => ClientRequestSchema,
	ClientResultSchema: () => ClientResultSchema,
	ClientTasksCapabilitySchema: () => ClientTasksCapabilitySchema,
	CompatibilityCallToolResultSchema: () => CompatibilityCallToolResultSchema,
	CompleteRequestParamsSchema: () => CompleteRequestParamsSchema,
	CompleteRequestSchema: () => CompleteRequestSchema,
	CompleteResultSchema: () => CompleteResultSchema,
	ContentBlockSchema: () => ContentBlockSchema,
	CreateMessageRequestParamsSchema: () => CreateMessageRequestParamsSchema,
	CreateMessageRequestSchema: () => CreateMessageRequestSchema,
	CreateMessageResultSchema: () => CreateMessageResultSchema,
	CreateMessageResultWithToolsSchema: () => CreateMessageResultWithToolsSchema,
	CreateTaskResultSchema: () => CreateTaskResultSchema,
	CursorSchema: () => CursorSchema,
	DiscoverRequestSchema: () => DiscoverRequestSchema,
	DiscoverResultSchema: () => DiscoverResultSchema,
	ElicitRequestFormParamsSchema: () => ElicitRequestFormParamsSchema,
	ElicitRequestParamsSchema: () => ElicitRequestParamsSchema,
	ElicitRequestSchema: () => ElicitRequestSchema,
	ElicitRequestURLParamsSchema: () => ElicitRequestURLParamsSchema,
	ElicitResultSchema: () => ElicitResultSchema,
	ElicitationCompleteNotificationParamsSchema: () => ElicitationCompleteNotificationParamsSchema,
	ElicitationCompleteNotificationSchema: () => ElicitationCompleteNotificationSchema,
	EmbeddedResourceSchema: () => EmbeddedResourceSchema,
	EmptyResultSchema: () => EmptyResultSchema,
	EnumSchemaSchema: () => EnumSchemaSchema,
	GetPromptRequestParamsSchema: () => GetPromptRequestParamsSchema,
	GetPromptRequestSchema: () => GetPromptRequestSchema,
	GetPromptResultSchema: () => GetPromptResultSchema,
	GetTaskPayloadRequestSchema: () => GetTaskPayloadRequestSchema,
	GetTaskPayloadResultSchema: () => GetTaskPayloadResultSchema,
	GetTaskRequestSchema: () => GetTaskRequestSchema,
	GetTaskResultSchema: () => GetTaskResultSchema,
	IconSchema: () => IconSchema,
	IconsSchema: () => IconsSchema,
	ImageContentSchema: () => ImageContentSchema,
	ImplementationSchema: () => ImplementationSchema,
	InitializeRequestParamsSchema: () => InitializeRequestParamsSchema,
	InitializeRequestSchema: () => InitializeRequestSchema,
	InitializeResultSchema: () => InitializeResultSchema,
	InitializedNotificationSchema: () => InitializedNotificationSchema,
	JSONArraySchema: () => JSONArraySchema,
	JSONObjectSchema: () => JSONObjectSchema,
	JSONRPCErrorResponseSchema: () => JSONRPCErrorResponseSchema,
	JSONRPCMessageSchema: () => JSONRPCMessageSchema,
	JSONRPCNotificationSchema: () => JSONRPCNotificationSchema,
	JSONRPCRequestSchema: () => JSONRPCRequestSchema,
	JSONRPCResponseSchema: () => JSONRPCResponseSchema,
	JSONRPCResultResponseSchema: () => JSONRPCResultResponseSchema,
	JSONValueSchema: () => JSONValueSchema,
	LegacyTitledEnumSchemaSchema: () => LegacyTitledEnumSchemaSchema,
	ListChangedOptionsBaseSchema: () => ListChangedOptionsBaseSchema,
	ListPromptsRequestSchema: () => ListPromptsRequestSchema,
	ListPromptsResultSchema: () => ListPromptsResultSchema,
	ListResourceTemplatesRequestSchema: () => ListResourceTemplatesRequestSchema,
	ListResourceTemplatesResultSchema: () => ListResourceTemplatesResultSchema,
	ListResourcesRequestSchema: () => ListResourcesRequestSchema,
	ListResourcesResultSchema: () => ListResourcesResultSchema,
	ListRootsRequestSchema: () => ListRootsRequestSchema,
	ListRootsResultSchema: () => ListRootsResultSchema,
	ListTasksRequestSchema: () => ListTasksRequestSchema,
	ListTasksResultSchema: () => ListTasksResultSchema,
	ListToolsRequestSchema: () => ListToolsRequestSchema,
	ListToolsResultSchema: () => ListToolsResultSchema,
	LoggingLevelSchema: () => LoggingLevelSchema,
	LoggingMessageNotificationParamsSchema: () => LoggingMessageNotificationParamsSchema,
	LoggingMessageNotificationSchema: () => LoggingMessageNotificationSchema,
	ModelHintSchema: () => ModelHintSchema,
	ModelPreferencesSchema: () => ModelPreferencesSchema,
	MultiSelectEnumSchemaSchema: () => MultiSelectEnumSchemaSchema,
	NotificationSchema: () => NotificationSchema,
	NotificationsParamsSchema: () => NotificationsParamsSchema,
	NumberSchemaSchema: () => NumberSchemaSchema,
	PaginatedRequestParamsSchema: () => PaginatedRequestParamsSchema,
	PaginatedRequestSchema: () => PaginatedRequestSchema,
	PaginatedResultSchema: () => PaginatedResultSchema,
	PingRequestSchema: () => PingRequestSchema,
	PrimitiveSchemaDefinitionSchema: () => PrimitiveSchemaDefinitionSchema,
	ProgressNotificationParamsSchema: () => ProgressNotificationParamsSchema,
	ProgressNotificationSchema: () => ProgressNotificationSchema,
	ProgressSchema: () => ProgressSchema,
	ProgressTokenSchema: () => ProgressTokenSchema,
	PromptArgumentSchema: () => PromptArgumentSchema,
	PromptListChangedNotificationSchema: () => PromptListChangedNotificationSchema,
	PromptMessageSchema: () => PromptMessageSchema,
	PromptReferenceSchema: () => PromptReferenceSchema,
	PromptSchema: () => PromptSchema,
	ReadResourceRequestParamsSchema: () => ReadResourceRequestParamsSchema,
	ReadResourceRequestSchema: () => ReadResourceRequestSchema,
	ReadResourceResultSchema: () => ReadResourceResultSchema,
	RelatedTaskMetadataSchema: () => RelatedTaskMetadataSchema,
	RequestIdSchema: () => RequestIdSchema,
	RequestMetaSchema: () => RequestMetaSchema,
	RequestSchema: () => RequestSchema,
	ResourceContentsSchema: () => ResourceContentsSchema,
	ResourceLinkSchema: () => ResourceLinkSchema,
	ResourceListChangedNotificationSchema: () => ResourceListChangedNotificationSchema,
	ResourceRequestParamsSchema: () => ResourceRequestParamsSchema,
	ResourceSchema: () => ResourceSchema,
	ResourceTemplateReferenceSchema: () => ResourceTemplateReferenceSchema,
	ResourceTemplateSchema: () => ResourceTemplateSchema,
	ResourceUpdatedNotificationParamsSchema: () => ResourceUpdatedNotificationParamsSchema,
	ResourceUpdatedNotificationSchema: () => ResourceUpdatedNotificationSchema,
	ResultMetaObjectSchema: () => ResultMetaObjectSchema,
	ResultSchema: () => ResultSchema,
	RoleSchema: () => RoleSchema,
	RootSchema: () => RootSchema,
	RootsListChangedNotificationSchema: () => RootsListChangedNotificationSchema,
	SamplingContentSchema: () => SamplingContentSchema,
	SamplingMessageContentBlockSchema: () => SamplingMessageContentBlockSchema,
	SamplingMessageSchema: () => SamplingMessageSchema,
	ServerCapabilitiesSchema: () => ServerCapabilitiesSchema,
	ServerNotificationSchema: () => ServerNotificationSchema,
	ServerRequestSchema: () => ServerRequestSchema,
	ServerResultSchema: () => ServerResultSchema,
	ServerTasksCapabilitySchema: () => ServerTasksCapabilitySchema,
	SetLevelRequestParamsSchema: () => SetLevelRequestParamsSchema,
	SetLevelRequestSchema: () => SetLevelRequestSchema,
	SingleSelectEnumSchemaSchema: () => SingleSelectEnumSchemaSchema,
	StringSchemaSchema: () => StringSchemaSchema,
	SubscribeRequestParamsSchema: () => SubscribeRequestParamsSchema,
	SubscribeRequestSchema: () => SubscribeRequestSchema,
	SubscriptionFilterSchema: () => SubscriptionFilterSchema,
	SubscriptionsAcknowledgedNotificationParamsSchema: () => SubscriptionsAcknowledgedNotificationParamsSchema,
	SubscriptionsAcknowledgedNotificationSchema: () => SubscriptionsAcknowledgedNotificationSchema,
	SubscriptionsListenRequestParamsSchema: () => SubscriptionsListenRequestParamsSchema,
	SubscriptionsListenRequestSchema: () => SubscriptionsListenRequestSchema,
	SubscriptionsListenResultMetaSchema: () => SubscriptionsListenResultMetaSchema,
	SubscriptionsListenResultSchema: () => SubscriptionsListenResultSchema,
	TaskAugmentedRequestParamsSchema: () => TaskAugmentedRequestParamsSchema,
	TaskCreationParamsSchema: () => TaskCreationParamsSchema,
	TaskMetadataSchema: () => TaskMetadataSchema,
	TaskSchema: () => TaskSchema,
	TaskStatusNotificationParamsSchema: () => TaskStatusNotificationParamsSchema,
	TaskStatusNotificationSchema: () => TaskStatusNotificationSchema,
	TaskStatusSchema: () => TaskStatusSchema,
	TextContentSchema: () => TextContentSchema,
	TextResourceContentsSchema: () => TextResourceContentsSchema,
	TitledMultiSelectEnumSchemaSchema: () => TitledMultiSelectEnumSchemaSchema,
	TitledSingleSelectEnumSchemaSchema: () => TitledSingleSelectEnumSchemaSchema,
	ToolAnnotationsSchema: () => ToolAnnotationsSchema,
	ToolChoiceSchema: () => ToolChoiceSchema,
	ToolExecutionSchema: () => ToolExecutionSchema,
	ToolListChangedNotificationSchema: () => ToolListChangedNotificationSchema,
	ToolResultContentSchema: () => ToolResultContentSchema,
	ToolSchema: () => ToolSchema,
	ToolUseContentSchema: () => ToolUseContentSchema,
	UnsubscribeRequestParamsSchema: () => UnsubscribeRequestParamsSchema,
	UnsubscribeRequestSchema: () => UnsubscribeRequestSchema,
	UntitledMultiSelectEnumSchemaSchema: () => UntitledMultiSelectEnumSchemaSchema,
	UntitledSingleSelectEnumSchemaSchema: () => UntitledSingleSelectEnumSchemaSchema
});
const isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
const isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
/**
* Checks if a value is a valid {@linkcode JSONRPCResultResponse}.
* @param value - The value to check.
*
* @returns True if the value is a valid {@linkcode JSONRPCResultResponse}, false otherwise.
*/
const isJSONRPCResultResponse = (value) => JSONRPCResultResponseSchema.safeParse(value).success;
/**
* Checks if a value is a valid {@linkcode JSONRPCErrorResponse}.
* @param value - The value to check.
*
* @returns True if the value is a valid {@linkcode JSONRPCErrorResponse}, false otherwise.
*/
const isJSONRPCErrorResponse = (value) => JSONRPCErrorResponseSchema.safeParse(value).success;
/**
* Checks whether a value is an input-required result (protocol revision
* 2026-07-28): the multi-round-trip return shape discriminated by
* `resultType: 'input_required'`.
*
* This is a discriminator check, not a full validator — the at-least-one rule
* (`inputRequests` or `requestState`) is enforced by the `inputRequired()`
* builder and re-checked by the server seam for hand-built values.
*
* @param value - The value to check.
* @returns True if the value carries the `input_required` discriminator.
*/
const isInputRequiredResult = (value) => typeof value === "object" && value !== null && !Array.isArray(value) && value.resultType === "input_required";
function assertCompleteRequestPrompt(request) {
	if (request.params.ref.type !== "ref/prompt") throw new TypeError(`Expected CompleteRequestPrompt, but got ${request.params.ref.type}`);
}
function assertCompleteRequestResourceTemplate(request) {
	if (request.params.ref.type !== "ref/resource") throw new TypeError(`Expected CompleteRequestResourceTemplate, but got ${request.params.ref.type}`);
}
/** The schema-extension property name a tool's `inputSchema` carries. */
const X_MCP_HEADER_KEY = "x-mcp-header";
/**
* RFC 9110 §5.1 `token` syntax (`1*tchar`). Rejects empty, space, control
* characters (including CR/LF), and the listed delimiters.
*/
const RFC9110_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
/**
* JSON Schema `type` values the spec admits on an `x-mcp-header` property.
*
* The spec text names `integer`, `string`, `boolean` and explicitly excludes
* `number`. The published conformance referee at the pinned release ships its
* `http-custom-headers` scenario with two `type: "number"` `x-mcp-header`
* parameters and expects the client to mirror them, so `number` is accepted
* here so that the conformance gate passes; the discrepancy is tracked
* upstream. Everything else (`object`, `array`, `null`, absent) is rejected.
*/
const PERMITTED_X_MCP_HEADER_TYPES = /* @__PURE__ */ new Set([
	"string",
	"integer",
	"boolean",
	"number"
]);
/**
* Scan a tool's JSON-serialized `inputSchema` for `x-mcp-header` declarations
* and validate every constraint the spec places on them. Returns either the
* collected declarations (possibly empty) or the first violated constraint.
*
* The walk descends through `properties` at any depth (the spec's "any nesting
* depth" clause). The static-reachability MUST is enforced as a structural
* sweep: every position the chain MUST NOT pass through (`items`/
* `additionalProperties`, `oneOf`/`anyOf`/`allOf`/`not`, `if`/`then`/`else`,
* `$defs`, `$ref` targets within `$defs`) is visited too, and an
* `x-mcp-header` found anywhere on that path invalidates the schema — "an
* annotation anywhere else makes the tool definition invalid".
*/
function scanXMcpHeaderDeclarations(inputSchema) {
	const declarations = [];
	const seenLower = /* @__PURE__ */ new Map();
	const visit = (node, path, reachable) => {
		if (node === null || typeof node !== "object") return void 0;
		const schema = node;
		if (X_MCP_HEADER_KEY in schema) {
			if (!reachable || path.length === 0) return `${pathName(path)}: x-mcp-header is only permitted on properties statically reachable via a chain of 'properties' keys (not under items, additionalProperties, oneOf/anyOf/allOf/not, if/then/else, or $ref)`;
			const raw = schema[X_MCP_HEADER_KEY];
			if (typeof raw !== "string" || raw.length === 0) return `${pathName(path)}: x-mcp-header MUST be a non-empty string`;
			if (!RFC9110_TOKEN.test(raw)) return `${pathName(path)}: x-mcp-header '${raw}' is not a valid RFC 9110 token (no spaces, control characters or HTTP delimiters)`;
			const type = typeof schema.type === "string" ? schema.type : void 0;
			if (type === void 0 || !PERMITTED_X_MCP_HEADER_TYPES.has(type)) return `${pathName(path)}: x-mcp-header is only permitted on primitive-typed properties (string, integer, boolean); got ${type ?? "<none>"}`;
			const lower = raw.toLowerCase();
			const prior = seenLower.get(lower);
			if (prior !== void 0) return `x-mcp-header '${raw}' is not case-insensitively unique (also declared as '${prior}')`;
			seenLower.set(lower, raw);
			declarations.push({
				path,
				headerName: raw,
				type
			});
		}
		const properties = schema.properties;
		if (properties !== null && typeof properties === "object") for (const [key, child] of Object.entries(properties)) {
			const fault$1 = visit(child, [...path, key], reachable);
			if (fault$1 !== void 0) return fault$1;
		}
		for (const k of NON_REACHABLE_SUBSCHEMA_KEYWORDS) {
			const sub = schema[k];
			if (sub === void 0) continue;
			const branches = Array.isArray(sub) ? sub : sub !== null && typeof sub === "object" && OBJECT_VALUED_SUBSCHEMA_KEYWORDS.has(k) ? Object.values(sub) : [sub];
			for (const branch of branches) {
				const fault$1 = visit(branch, [...path, `<${k}>`], false);
				if (fault$1 !== void 0) return fault$1;
			}
		}
	};
	const fault = visit(inputSchema, [], true);
	return fault === void 0 ? {
		valid: true,
		declarations
	} : {
		valid: false,
		reason: fault
	};
}
/**
* JSON Schema keywords whose subschemas the SEP-2243 static-reachability
* constraint excludes from the `properties`-only chain. An `x-mcp-header`
* found under any of these invalidates the tool definition.
*/
const NON_REACHABLE_SUBSCHEMA_KEYWORDS = [
	"items",
	"prefixItems",
	"contains",
	"additionalProperties",
	"unevaluatedProperties",
	"unevaluatedItems",
	"propertyNames",
	"patternProperties",
	"dependentSchemas",
	"oneOf",
	"anyOf",
	"allOf",
	"not",
	"if",
	"then",
	"else",
	"$defs",
	"definitions"
];
/**
* Subschema-carrying keywords whose value is a `name → subschema` object
* (not a single subschema or array of subschemas). The visit branches over
* `Object.values()` for these.
*/
const OBJECT_VALUED_SUBSCHEMA_KEYWORDS = /* @__PURE__ */ new Set([
	"patternProperties",
	"dependentSchemas",
	"$defs",
	"definitions"
]);
function pathName(path) {
	return path.length === 0 ? "<root>" : path.join(".");
}
ProtocolErrorCode.InvalidRequest, ProtocolErrorCode.UnsupportedProtocolVersion, ProtocolErrorCode.InvalidParams, ProtocolErrorCode.MethodNotFound, ProtocolErrorCode.InvalidParams, ProtocolErrorCode.MissingRequiredClientCapability;
ProtocolErrorCode.ParseError, ProtocolErrorCode.InvalidRequest, ProtocolErrorCode.MethodNotFound, ProtocolErrorCode.UnsupportedProtocolVersion, ProtocolErrorCode.MissingRequiredClientCapability;
function rejection(rung, cell, httpStatus, error, settled) {
	return {
		kind: "reject",
		rung,
		cell,
		httpStatus,
		code: error.code,
		message: error.message,
		...error.data !== void 0 && { data: error.data },
		settled
	};
}
/**
* Whether a request's params carry a per-request envelope claim that is both
* well-formed and names a modern protocol revision.
*
* Used by the `initialize` precedence rule: only such a claim overrides the
* `initialize` ⇒ legacy-handshake classification — a request carrying a valid
* modern envelope is a modern request regardless of its method name, and the
* modern era then answers `initialize` exactly like any other method it does
* not define (method-not-found). A malformed claim, or one naming a pre-2026
* revision, keeps the legacy-handshake routing unchanged.
*
* Exported on the core internal barrel for the stdio serving entry, which
* applies the same precedence rule to a connection's opening message; not
* public API.
*/
function carriesValidModernEnvelopeClaim(params) {
	if (!hasEnvelopeClaim(params)) return false;
	const claimedVersion = envelopeClaimVersion(params);
	if (claimedVersion === void 0 || !isModernProtocolVersion(claimedVersion)) return false;
	const meta = requestMetaOf(params);
	return meta !== void 0 && validateEnvelopeMeta(meta).length === 0;
}
/**
* The rejection a modern-only endpoint (no legacy serving configured)
* answers a legacy-classified request with.
*
* - Envelope-less requests (including `initialize`) are answered with the
*   unsupported-protocol-version error carrying the endpoint's supported
*   versions and echoing the version the request named (when it named one —
*   `requested` is omitted rather than fabricated when the request named no
*   version at all), so a legacy client can discover what the endpoint serves
*   from the error alone.
* - Posted responses and batch arrays are invalid requests on the modern era.
* - Non-`POST` methods are not allowed.
* - Legacy-classified notifications return `undefined`: the caller answers
*   202 with no body and does not dispatch the notification (accept-and-drop).
*/
function modernOnlyStrictRejection(route, supportedVersions) {
	switch (route.reason) {
		case "http-method": return rejection("http-method", "modern-only-method-not-allowed", 405, new ProtocolError(-32e3, "Method not allowed."), true);
		case "batch": return rejection("jsonrpc-shape", "modern-only-batch-not-supported", 400, new ProtocolError(ProtocolErrorCode.InvalidRequest, "Bad Request: JSON-RPC batches are not supported by this endpoint"), true);
		case "response": return rejection("jsonrpc-shape", "modern-only-response-post", 400, new ProtocolError(ProtocolErrorCode.InvalidRequest, "Bad Request: JSON-RPC responses cannot be posted to this endpoint"), true);
		case "notification": return;
		case "initialize":
		case "no-claim": {
			const requested = route.requestedVersion;
			return rejection("era-classification", "modern-only-missing-envelope", 400, requested === void 0 ? new ProtocolError(ProtocolErrorCode.UnsupportedProtocolVersion, "Unsupported protocol version: the request did not name a protocol version", { supported: [...supportedVersions] }) : new UnsupportedProtocolVersionError({
				supported: [...supportedVersions],
				requested
			}), true);
		}
	}
}
/**
* Internal Zod schema utilities for protocol handling.
* These are used internally by the SDK for protocol message validation.
*/
/**
* Parses data against a Zod schema (synchronous).
* Returns a discriminated union with success/error.
*/
function parseSchema(schema, data) {
	return safeParse(schema, data);
}
/**
* Union of the declared shape keys across several Zod object schemas.
*/
function shapeKeys(schemas) {
	return new Set(schemas.flatMap((schema) => Object.keys(schema.shape)));
}
/**
* Standard Schema utilities for user-provided schemas.
* Supports Zod v4, Valibot, ArkType, and other Standard Schema implementations.
* @see https://standardschema.dev
*/
function isStandardSchema(schema) {
	if (schema == null) return false;
	const schemaType = typeof schema;
	if (schemaType !== "object" && schemaType !== "function") return false;
	if (!("~standard" in schema)) return false;
	return typeof schema["~standard"]?.validate === "function";
}
let warnedZodFallback = false;
/** JSON Schema draft targeted by every conversion; shared so pattern references above stay in lockstep. */
const JSON_SCHEMA_CONVERSION_TARGET = "draft-2020-12";
/**
* Converts a StandardSchema to JSON Schema for use as an MCP tool/prompt schema.
*
* MCP requires `type: "object"` at the root of tool `inputSchema` and prompt
* argument schemas; `outputSchema` may have any JSON Schema root (SEP-2106).
* Zod's discriminated unions emit `{oneOf: [...]}` without a top-level `type`,
* so for `io: 'input'` this function defaults `type` to `"object"` when absent
* and throws on an explicit non-object `type` (e.g. `z.string()`). For
* `io: 'output'` a non-object root is returned as-is; the `"object"` default is
* applied only when the root is provably object-shaped.
*/
function standardSchemaToJsonSchema(schema, io = "input") {
	const std = schema["~standard"];
	let result;
	if (std.jsonSchema) result = std.jsonSchema[io]({ target: JSON_SCHEMA_CONVERSION_TARGET });
	else if (std.vendor === "zod") {
		if (!("_zod" in schema)) throw new Error("Schema appears to be from zod 3, which the SDK cannot convert to JSON Schema. Upgrade to zod >=4.2.0, or wrap your JSON Schema with fromJsonSchema().");
		if (!warnedZodFallback) {
			warnedZodFallback = true;
			console.warn("[mcp-sdk] Your zod version does not implement `~standard.jsonSchema` (added in zod 4.2.0). Falling back to z.toJSONSchema(). Upgrade to zod >=4.2.0 to silence this warning.");
		}
		result = toJSONSchema(schema, {
			target: JSON_SCHEMA_CONVERSION_TARGET,
			io
		});
	} else throw new Error(`Schema library "${std.vendor}" does not implement StandardJSONSchemaV1 (\`~standard.jsonSchema\`). Upgrade to a version that does, or wrap your JSON Schema with fromJsonSchema().`);
	if (io === "output") {
		if (result.type !== void 0) return result;
		return isProvablyObjectShapedRoot(result) ? {
			type: "object",
			...result
		} : result;
	}
	if (result.type !== void 0 && result.type !== "object") throw new Error(`MCP tool and prompt schemas must describe objects (got type: ${JSON.stringify(result.type)}). Wrap your schema in z.object({...}) or equivalent.`);
	return {
		type: "object",
		...result
	};
}
/**
* A typeless JSON Schema root is "provably object-shaped" when either it carries object keywords
* directly (`properties`/`patternProperties`/`additionalProperties`/`required`), or it is a
* composition (`oneOf`/`anyOf`/`allOf`) whose every member is itself `type:'object'` or recursively
* provably object-shaped (e.g. a nested `discriminatedUnion`). `$ref` is not followed. Used to
* decide whether stamping `type:'object'` is safe (redundant-but-valid) versus self-contradictory.
*/
function isProvablyObjectShapedRoot(schema) {
	if ("properties" in schema || "patternProperties" in schema || "additionalProperties" in schema || "required" in schema) return true;
	for (const key of [
		"oneOf",
		"anyOf",
		"allOf"
	]) {
		const members = schema[key];
		if (Array.isArray(members) && members.length > 0) return members.every((m) => m !== null && typeof m === "object" && (m.type === "object" || isProvablyObjectShapedRoot(m)));
	}
	return false;
}
function formatIssue(issue) {
	if (!issue.path?.length) return issue.message;
	return `${issue.path.map((p) => String(typeof p === "object" ? p.key : p)).join(".")}: ${issue.message}`;
}
async function validateStandardSchema(schema, data) {
	const result = await schema["~standard"].validate(data);
	if (result.issues && result.issues.length > 0) return {
		success: false,
		error: result.issues.map((i) => formatIssue(i)).join(", ")
	};
	return {
		success: true,
		data: result.value
	};
}
function zodEmittedPattern(schema) {
	const jsonSchema = toJSONSchema(schema, {
		target: JSON_SCHEMA_CONVERSION_TARGET,
		io: "input"
	});
	return typeof jsonSchema.pattern === "string" ? jsonSchema.pattern : void 0;
}
const DATETIME_FRACTION_DIGITS = /\\\.\\d\{(\d+)\}/;
function datetimeReferenceSchemas(pattern) {
	const fractionDigits = DATETIME_FRACTION_DIGITS.exec(pattern);
	const precisions = [
		void 0,
		-1,
		0
	];
	if (fractionDigits) precisions.push(Number(fractionDigits[1]));
	return [false, true].flatMap((local) => [false, true].flatMap((offset) => precisions.map((precision) => datetime({
		local,
		offset,
		precision
	}))));
}
function referencePatternsForFormat(format, pattern) {
	let referenceSchemas;
	switch (format) {
		case "email":
			referenceSchemas = [email()];
			break;
		case "uri":
			referenceSchemas = [url()];
			break;
		case "date":
			referenceSchemas = [date$1()];
			break;
		case "date-time": referenceSchemas = datetimeReferenceSchemas(pattern);
	}
	return new Set(referenceSchemas.map((schema) => zodEmittedPattern(schema)).filter((emitted) => emitted !== void 0));
}
/** Whether `pattern` is the library's own realization of `format` (droppable) rather than a user customization. */
function isLibraryFormatPattern(format, pattern, vendor) {
	if (vendor !== "zod") return true;
	return referencePatternsForFormat(format, pattern).has(pattern);
}
function promptArgumentsFromStandardSchema(schema) {
	const jsonSchema = standardSchemaToJsonSchema(schema, "input");
	const properties = jsonSchema.properties || {};
	const required = jsonSchema.required || [];
	return Object.entries(properties).map(([name, prop]) => ({
		name,
		description: prop?.description,
		required: required.includes(name)
	}));
}
function isJsonObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function convertStandardElicitationSchema(schema) {
	try {
		return standardSchemaToJsonSchema(schema, "input");
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Elicitation requestedSchema must describe an object with flat primitive properties: ${detail}`);
	}
}
const ANNOTATION_ONLY_JSON_SCHEMA_KEYWORDS = /* @__PURE__ */ new Set([
	"$comment",
	"deprecated",
	"description",
	"examples",
	"readOnly",
	"title",
	"writeOnly"
]);
function isAnnotationOnlyJsonSchemaKeyword(key) {
	return ANNOTATION_ONLY_JSON_SCHEMA_KEYWORDS.has(key) || key.startsWith("x-");
}
const ROOT_KEYS = /* @__PURE__ */ new Set(["$schema", ...Object.keys(ElicitRequestFormParamsSchema.shape.requestedSchema.shape)]);
const PROPERTY_KEYS_BY_TYPE = {
	string: shapeKeys([
		StringSchemaSchema,
		UntitledSingleSelectEnumSchemaSchema,
		TitledSingleSelectEnumSchemaSchema,
		LegacyTitledEnumSchemaSchema
	]),
	number: shapeKeys([NumberSchemaSchema]),
	integer: shapeKeys([NumberSchemaSchema]),
	boolean: shapeKeys([BooleanSchemaSchema]),
	array: shapeKeys([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema])
};
const SUPPORTED_STRING_FORMATS = new Set(StringSchemaSchema.shape.format.unwrap().options);
/** Walks one property node: keeps grammar keys, drops the library format pattern, rejects unknown constraints. */
function walkProperty(node, path, vendor, unsupported) {
	if (!isJsonObject(node)) return node;
	const allowedKeys = typeof node.type === "string" && Object.hasOwn(PROPERTY_KEYS_BY_TYPE, node.type) ? PROPERTY_KEYS_BY_TYPE[node.type] : void 0;
	if (allowedKeys === void 0) return node;
	const pruned = {};
	for (const [key, value] of Object.entries(node)) if (allowedKeys.has(key) || isAnnotationOnlyJsonSchemaKeyword(key)) pruned[key] = value;
	else if (key === "pattern" && node.type === "string" && typeof node.format === "string") {
		if (!SUPPORTED_STRING_FORMATS.has(node.format)) pruned[key] = value;
		else if (typeof value !== "string" || !isLibraryFormatPattern(node.format, value, vendor)) unsupported.push(`${path}.${key}`);
	} else unsupported.push(`${path}.${key}`);
	return pruned;
}
/** Walks the schema root: keeps the spec root keys, drops annotations, rejects the rest. */
function walkRequestedSchema(converted, vendor) {
	const pruned = {};
	const unsupported = [];
	for (const [key, value] of Object.entries(converted)) if (key === "properties" && isJsonObject(value)) pruned[key] = Object.fromEntries(Object.entries(value).map(([name, node]) => [name, walkProperty(node, `properties.${name}`, vendor, unsupported)]));
	else if (ROOT_KEYS.has(key)) pruned[key] = value;
	else if (!isAnnotationOnlyJsonSchemaKeyword(key)) unsupported.push(key);
	if (unsupported.length > 0) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Elicitation requestedSchema contains unsupported JSON Schema constraint(s) after Standard Schema conversion: ${unsupported.join(", ")}`);
	return pruned;
}
/** Names the properties that fail value validation, instead of surfacing a raw union dump. */
function describeUnsupportedProperties(pruned, fallback) {
	if (!isJsonObject(pruned.properties)) return fallback;
	const offenders = Object.entries(pruned.properties).filter(([, node]) => !parseSchema(PrimitiveSchemaDefinitionSchema, node).success).map(([name]) => `properties.${name}`);
	return offenders.length > 0 ? offenders.join(", ") : fallback;
}
function findDroppedConstraintPaths(original, parsed, path = "") {
	if (Array.isArray(original) && Array.isArray(parsed)) return original.flatMap((item, index) => findDroppedConstraintPaths(item, parsed[index], `${path}[${index}]`));
	if (!isJsonObject(original) || !isJsonObject(parsed)) return [];
	return Object.entries(original).flatMap(([key, value]) => {
		const childPath = path ? `${path}.${key}` : key;
		if (!Object.prototype.hasOwnProperty.call(parsed, key)) return isAnnotationOnlyJsonSchemaKeyword(key) ? [] : [childPath];
		return findDroppedConstraintPaths(value, parsed[key], childPath);
	});
}
/** Converts an authoring-friendly elicitation input into its wire-ready form. */
function normalizeElicitInputParams(input) {
	if (!isStandardSchema(input.requestedSchema)) return {
		...input,
		mode: "form",
		requestedSchema: input.requestedSchema
	};
	const vendor = input.requestedSchema["~standard"].vendor;
	const pruned = walkRequestedSchema(convertStandardElicitationSchema(input.requestedSchema), vendor);
	const parsed = parseSchema(ElicitRequestFormParamsSchema.shape.requestedSchema, pruned);
	if (!parsed.success) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Elicitation requestedSchema only supports flat primitive properties (string, number, integer, boolean, and string enums): ${describeUnsupportedProperties(pruned, parsed.error.message)}`);
	const droppedConstraints = findDroppedConstraintPaths(pruned, parsed.data);
	if (droppedConstraints.length > 0) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Elicitation requestedSchema contains unsupported JSON Schema constraint(s) after Standard Schema conversion: ${droppedConstraints.join(", ")}`);
	const danglingRequired = (parsed.data.required ?? []).filter((key) => !Object.prototype.hasOwnProperty.call(parsed.data.properties, key));
	if (danglingRequired.length > 0) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Elicitation requestedSchema lists required properties that are not defined in properties: ${danglingRequired.join(", ")}`);
	return {
		...input,
		mode: "form",
		requestedSchema: parsed.data
	};
}
/**
* Authoring helpers for multi-round-trip requests (protocol revision
* 2026-07-28).
*
* A handler for one of the multi-round-trip methods (`tools/call`,
* `prompts/get`, `resources/read`) requests additional client input by
* returning an {@linkcode InputRequiredResult} instead of a final result. The
* helpers here build that return value and its embedded requests as NEUTRAL
* values; only the 2026-07-28 wire codec maps them to/from the wire. The
* 2025-era codec has no input-required vocabulary — on a 2025-era request the
* server's legacy shim (on by default) fulfils the embedded requests as real
* server→client requests and re-enters the handler, so the same return shape
* serves both eras; `ServerOptions.inputRequired.legacyShim: false` restores
* the pre-shim loud failure.
*
* There is no nominal brand: `resultType: 'input_required'` is the
* discriminator, and hand-built result literals are equally legal — the
* server seam re-checks the at-least-one rule for them.
*/
function buildInputRequired(spec) {
	const hasInputRequests = spec.inputRequests !== void 0 && Object.keys(spec.inputRequests).length > 0;
	const hasRequestState = typeof spec.requestState === "string";
	if (!hasInputRequests && !hasRequestState) throw new TypeError("inputRequired() requires at least one of inputRequests (with at least one entry) or requestState (spec: every InputRequiredResult MUST include at least one of the two)");
	return {
		resultType: "input_required",
		...spec.inputRequests !== void 0 && { inputRequests: spec.inputRequests },
		...spec.requestState !== void 0 && { requestState: spec.requestState }
	};
}
Object.assign(buildInputRequired, {
	elicit(params) {
		try {
			return {
				method: "elicitation/create",
				params: normalizeElicitInputParams(params)
			};
		} catch (error) {
			throw error instanceof ProtocolError ? new TypeError(error.message, { cause: error }) : error;
		}
	},
	elicitUrl(params) {
		return {
			method: "elicitation/create",
			params: {
				...params,
				mode: "url"
			}
		};
	},
	createMessage(params) {
		return {
			method: "sampling/createMessage",
			params
		};
	},
	listRoots() {
		return { method: "roots/list" };
	}
});
/**
* The message both multi-round-trip loops emit when the round cap is
* exhausted — the client driver as a typed error, the server-side legacy
* shim as its per-family failure. One formatter so the texts cannot drift
* (hosts and models read the tool-result copy verbatim).
*/
function inputRequiredRoundsExceededMessage(method, maxRounds) {
	return `Multi-round-trip request '${method}' still required input after ${maxRounds} rounds (inputRequired.maxRounds)`;
}
/**
* Abortable delay: resolves after `ms`, or rejects with the signal's reason
* (wrapped in an `SdkError` when it isn't already one) if the signal aborts
* first. Aborting after resolution is a no-op. Shared with the server-side
* legacy shim (the pacing semantics must match per era).
*/
function sleep(ms, signal) {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason instanceof SdkError ? signal.reason : new SdkError(SdkErrorCode.RequestTimeout, String(signal.reason)));
			return;
		}
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal?.reason instanceof SdkError ? signal.reason : new SdkError(SdkErrorCode.RequestTimeout, String(signal?.reason)));
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}
/**
* A per-round abort linked to the caller's signal: the embedded sibling
* dispatches share it, so the first failure (or a caller abort) cancels the
* others instead of leaving them running. Shared with the server-side legacy
* shim (the abort-linkage semantics must match per era).
*/
function linkedRoundAbort(outer) {
	const controller = new AbortController();
	const onOuterAbort = () => controller.abort(outer?.reason);
	outer?.addEventListener("abort", onOuterAbort, { once: true });
	if (outer?.aborted) controller.abort(outer.reason);
	return {
		signal: controller.signal,
		abort: (reason) => controller.abort(reason),
		dispose: () => outer?.removeEventListener("abort", onOuterAbort)
	};
}
/**
* Explicit allowlist of protocol Zod schemas that correspond to a public spec type in `types.ts`.
*
* This intentionally excludes internal helper schemas exported from `schemas.ts` that have no
* matching public type (e.g. `ListChangedOptionsBaseSchema`, `BaseRequestParamsSchema`,
* `NotificationsParamsSchema`, `ClientTasksCapabilitySchema`, `ServerTasksCapabilitySchema`).
* Keeping the list explicit means new public spec types must be added here deliberately, and
* internals never leak into `SpecTypeName`.
*
* `ResourceTemplateSchema` is included; its public type is exported as `ResourceTemplateType`
* (the bare name collides with the server package's `ResourceTemplate` class), so
* `SpecTypes['ResourceTemplate']` is structurally equal to `ResourceTemplateType` rather than to
* a type literally named `ResourceTemplate`.
*/
const SPEC_SCHEMA_KEYS = [
	"AnnotationsSchema",
	"AudioContentSchema",
	"BaseMetadataSchema",
	"BlobResourceContentsSchema",
	"BooleanSchemaSchema",
	"CallToolRequestSchema",
	"CallToolRequestParamsSchema",
	"CallToolResultSchema",
	"CancelledNotificationSchema",
	"CancelledNotificationParamsSchema",
	"CancelTaskRequestSchema",
	"CancelTaskResultSchema",
	"ClientCapabilitiesSchema",
	"ClientNotificationSchema",
	"ClientRequestSchema",
	"ClientResultSchema",
	"CompatibilityCallToolResultSchema",
	"CompleteRequestSchema",
	"CompleteRequestParamsSchema",
	"CompleteResultSchema",
	"ContentBlockSchema",
	"CreateMessageRequestSchema",
	"CreateMessageRequestParamsSchema",
	"CreateMessageResultSchema",
	"CreateMessageResultWithToolsSchema",
	"CreateTaskResultSchema",
	"CursorSchema",
	"DiscoverRequestSchema",
	"DiscoverResultSchema",
	"ElicitationCompleteNotificationSchema",
	"ElicitationCompleteNotificationParamsSchema",
	"ElicitRequestSchema",
	"ElicitRequestFormParamsSchema",
	"ElicitRequestParamsSchema",
	"ElicitRequestURLParamsSchema",
	"ElicitResultSchema",
	"EmbeddedResourceSchema",
	"EmptyResultSchema",
	"EnumSchemaSchema",
	"GetPromptRequestSchema",
	"GetPromptRequestParamsSchema",
	"GetPromptResultSchema",
	"GetTaskPayloadRequestSchema",
	"GetTaskPayloadResultSchema",
	"GetTaskRequestSchema",
	"GetTaskResultSchema",
	"IconSchema",
	"IconsSchema",
	"ImageContentSchema",
	"ImplementationSchema",
	"InitializedNotificationSchema",
	"InitializeRequestSchema",
	"InitializeRequestParamsSchema",
	"InitializeResultSchema",
	"JSONArraySchema",
	"JSONObjectSchema",
	"JSONRPCErrorResponseSchema",
	"JSONRPCMessageSchema",
	"JSONRPCNotificationSchema",
	"JSONRPCRequestSchema",
	"JSONRPCResponseSchema",
	"JSONRPCResultResponseSchema",
	"JSONValueSchema",
	"LegacyTitledEnumSchemaSchema",
	"ListPromptsRequestSchema",
	"ListPromptsResultSchema",
	"ListResourcesRequestSchema",
	"ListResourcesResultSchema",
	"ListResourceTemplatesRequestSchema",
	"ListResourceTemplatesResultSchema",
	"ListRootsRequestSchema",
	"ListRootsResultSchema",
	"ListTasksRequestSchema",
	"ListTasksResultSchema",
	"ListToolsRequestSchema",
	"ListToolsResultSchema",
	"LoggingLevelSchema",
	"LoggingMessageNotificationSchema",
	"LoggingMessageNotificationParamsSchema",
	"ModelHintSchema",
	"ModelPreferencesSchema",
	"MultiSelectEnumSchemaSchema",
	"NotificationSchema",
	"NumberSchemaSchema",
	"PaginatedRequestSchema",
	"PaginatedRequestParamsSchema",
	"PaginatedResultSchema",
	"PingRequestSchema",
	"PrimitiveSchemaDefinitionSchema",
	"ProgressSchema",
	"ProgressNotificationSchema",
	"ProgressNotificationParamsSchema",
	"ProgressTokenSchema",
	"PromptSchema",
	"PromptArgumentSchema",
	"PromptListChangedNotificationSchema",
	"PromptMessageSchema",
	"PromptReferenceSchema",
	"ReadResourceRequestSchema",
	"ReadResourceRequestParamsSchema",
	"ReadResourceResultSchema",
	"RelatedTaskMetadataSchema",
	"RequestSchema",
	"RequestIdSchema",
	"RequestMetaSchema",
	"ResourceSchema",
	"ResourceContentsSchema",
	"ResourceLinkSchema",
	"ResourceListChangedNotificationSchema",
	"ResourceRequestParamsSchema",
	"ResourceTemplateSchema",
	"ResourceTemplateReferenceSchema",
	"ResourceUpdatedNotificationSchema",
	"ResourceUpdatedNotificationParamsSchema",
	"ResultMetaObjectSchema",
	"ResultSchema",
	"RoleSchema",
	"RootSchema",
	"RootsListChangedNotificationSchema",
	"SamplingContentSchema",
	"SamplingMessageSchema",
	"SamplingMessageContentBlockSchema",
	"ServerCapabilitiesSchema",
	"ServerNotificationSchema",
	"ServerRequestSchema",
	"ServerResultSchema",
	"SetLevelRequestSchema",
	"SetLevelRequestParamsSchema",
	"SingleSelectEnumSchemaSchema",
	"StringSchemaSchema",
	"SubscribeRequestSchema",
	"SubscribeRequestParamsSchema",
	"SubscriptionFilterSchema",
	"SubscriptionsAcknowledgedNotificationSchema",
	"SubscriptionsAcknowledgedNotificationParamsSchema",
	"SubscriptionsListenRequestSchema",
	"SubscriptionsListenRequestParamsSchema",
	"SubscriptionsListenResultSchema",
	"SubscriptionsListenResultMetaSchema",
	"TaskAugmentedRequestParamsSchema",
	"TaskCreationParamsSchema",
	"TaskMetadataSchema",
	"TaskSchema",
	"TaskStatusSchema",
	"TaskStatusNotificationSchema",
	"TaskStatusNotificationParamsSchema",
	"TextContentSchema",
	"TextResourceContentsSchema",
	"TitledMultiSelectEnumSchemaSchema",
	"TitledSingleSelectEnumSchemaSchema",
	"ToolSchema",
	"ToolAnnotationsSchema",
	"ToolChoiceSchema",
	"ToolExecutionSchema",
	"ToolListChangedNotificationSchema",
	"ToolResultContentSchema",
	"ToolUseContentSchema",
	"UnsubscribeRequestSchema",
	"UnsubscribeRequestParamsSchema",
	"UntitledMultiSelectEnumSchemaSchema",
	"UntitledSingleSelectEnumSchemaSchema"
];
const authSchemas = {
	IdJagTokenExchangeResponseSchema,
	OAuthClientInformationFullSchema,
	OAuthClientInformationSchema,
	OAuthClientMetadataSchema,
	OAuthClientRegistrationErrorSchema,
	OAuthErrorResponseSchema,
	OAuthMetadataSchema,
	OAuthProtectedResourceMetadataSchema,
	OAuthTokenRevocationRequestSchema,
	OAuthTokensSchema,
	OpenIdProviderDiscoveryMetadataSchema,
	OpenIdProviderMetadataSchema
};
const _specTypeSchemas = {};
const _isSpecType = {};
function register(key, schema) {
	const name = key.slice(0, -6);
	_specTypeSchemas[name] = schema;
	_isSpecType[name] = (v) => schema.safeParse(v).success;
}
for (const key of SPEC_SCHEMA_KEYS) register(key, schemas_exports[key]);
for (const [key, schema] of Object.entries(authSchemas)) register(key, schema);
Object.freeze(_specTypeSchemas);
Object.freeze(_isSpecType);
function bootstrapOutboundCodec(method) {
	switch (method) {
		case "initialize":
		case "notifications/initialized": return codecForVersion(void 0);
		case "server/discover": return codecForVersion(MODERN_WIRE_REVISION);
		default: return;
	}
}
/**
* The reserved per-request `_meta` envelope keys (protocol revision
* 2026-07-28). The protocol layer lifts these out of inbound `_meta` before
* handlers run and surfaces them at `ctx.mcpReq.envelope` — they are
* wire-level bookkeeping, not handler material.
*/
const RESERVED_ENVELOPE_META_KEYS = [
	PROTOCOL_VERSION_META_KEY,
	CLIENT_INFO_META_KEY,
	CLIENT_CAPABILITIES_META_KEY,
	LOG_LEVEL_META_KEY
];
/**
* Top-level params members carrying multi-round-trip driver material
* (protocol revision 2026-07-28). The spec reserves these names on
* client-initiated REQUESTS only — notification params keep them untouched
* (a vendor notification may legitimately use the same names).
*/
const RETRY_PARAMS_KEYS = ["inputResponses", "requestState"];
/**
* Lift wire-only material out of an inbound message so handlers see exactly
* the 2025-era shape, and surface it for the protocol layer (requests: via
* `ctx.mcpReq`). What counts as wire-only depends on the message kind: the
* reserved envelope `_meta` keys are reserved on every message, while the
* multi-round-trip retry fields (`inputResponses`/`requestState`) are
* reserved on client-initiated requests only — so notifications get only the
* envelope lift, and their top-level params stay untouched. Messages without
* wire-only material are returned unchanged (same reference).
*/
function liftWireOnlyMaterial(message, kind) {
	const params = message.params;
	if (!isPlainObject$1(params)) return {
		message,
		lifted: {}
	};
	const meta = params._meta;
	const envelopeKeys = isPlainObject$1(meta) ? RESERVED_ENVELOPE_META_KEYS.filter((key) => key in meta) : [];
	const retryKeys = kind === "request" ? RETRY_PARAMS_KEYS.filter((key) => key in params) : [];
	if (envelopeKeys.length === 0 && retryKeys.length === 0) return {
		message,
		lifted: {}
	};
	const lifted = {};
	const nextParams = { ...params };
	if (envelopeKeys.length > 0 && isPlainObject$1(meta)) {
		const envelope = {};
		const nextMeta = { ...meta };
		for (const key of envelopeKeys) {
			envelope[key] = meta[key];
			delete nextMeta[key];
		}
		lifted.envelope = envelope;
		if (Object.keys(nextMeta).length > 0) nextParams._meta = nextMeta;
		else delete nextParams._meta;
	}
	for (const key of retryKeys) {
		if (key === "inputResponses") lifted.inputResponses = nextParams[key];
		if (key === "requestState") lifted.requestState = nextParams[key];
		delete nextParams[key];
	}
	return {
		message: {
			...message,
			params: nextParams
		},
		lifted
	};
}
/**
* Standard Schema adapter over the era codec's `validateResult` function (the
* function-only WireCodec contract exposes no schema objects). Used by the
* spec-method `request()` overload so the request funnel keeps a single
* `StandardSchemaV1`-shaped validation seam for both spec and explicit-schema
* paths.
*
* Returns `undefined` when the method has no result entry on this era's
* registry — the caller maps that to the synchronous "pass a result schema"
* TypeError, exactly matching the pre-function-only behavior the
* typedMapAlignment suite pins (the result map deliberately excludes the
* `tasks/*` methods, so the spec-method overload refuses them up front).
*/
function codecResultValidator(codec, method) {
	const probe = codec.validateResult(method, void 0);
	if (!probe.ok && probe.reason === "not-in-era") return void 0;
	return { "~standard": {
		version: 1,
		vendor: "mcp-wire-codec",
		validate(value) {
			const outcome = codec.validateResult(method, value);
			if (outcome.ok) return { value: outcome.value };
			return { issues: [{ message: outcome.reason === "invalid" ? outcome.message : `not-in-era: ${method}` }] };
		}
	} };
}
/**
* Builds the `ctx.mcpReq.requestState` accessor for a resolved value. The
* `as T` below is the one place {@linkcode RequestStateAccessor}'s
* caller-asserted typing is implemented — no implementation can produce an
* arbitrary `T` from a runtime value honestly.
*/
function requestStateAccessor(value) {
	return () => value;
}
/** Shared no-state accessor: the common case allocates nothing per request. */
const NO_REQUEST_STATE = requestStateAccessor(void 0);
/**
* Returns a context whose `requestState` accessor reads the given value —
* how the server seam hands a verify hook's decoded payload (or the legacy
* shim's per-round echo) to the handler without mutating the original
* context.
*/
function withRequestStateValue(ctx, value) {
	return {
		...ctx,
		mcpReq: {
			...ctx.mcpReq,
			requestState: requestStateAccessor(value)
		}
	};
}
let writeNegotiatedProtocolVersion;
/**
* Package-internal write channel for a {@linkcode Protocol} instance's
* negotiated protocol version, for callers outside the class hierarchy:
* tests and the (future) modern-era server entry that marks a factory
* instance modern at binding time. Exported on the core internal barrel
* only — never public API.
*/
function setNegotiatedProtocolVersion(instance, version) {
	writeNegotiatedProtocolVersion(instance, version);
}
/**
* Implements MCP protocol framing on top of a pluggable transport, including
* features like request/response linking, notifications, and progress.
*
* `Protocol` is abstract; `Client` and `Server` are the concrete role-specific
* implementations most code should use.
*/
var Protocol = class {
	_transport;
	_requestMessageId = 0;
	_requestHandlers = /* @__PURE__ */ new Map();
	/** Methods registered with an explicit schema; the era gate in `_onrequest` reads it for the Tasks extension names. */
	_customSchemaRequestMethods = /* @__PURE__ */ new Set();
	_requestHandlerAbortControllers = /* @__PURE__ */ new Map();
	_notificationHandlers = /* @__PURE__ */ new Map();
	_responseHandlers = /* @__PURE__ */ new Map();
	_progressHandlers = /* @__PURE__ */ new Map();
	_timeoutInfo = /* @__PURE__ */ new Map();
	_pendingDebouncedNotifications = /* @__PURE__ */ new Set();
	/**
	* The protocol version negotiated for the current connection (`undefined`
	* before negotiation completes), which determines the wire era this
	* instance speaks. Set by the SDK's negotiation and initialize paths
	* (`Client.connect`, `Server._oninitialize`).
	*/
	_negotiatedProtocolVersion;
	static {
		writeNegotiatedProtocolVersion = (instance, version) => {
			instance._negotiatedProtocolVersion = version;
		};
	}
	_supportedProtocolVersions;
	/**
	* Callback for when the connection is closed for any reason.
	*
	* This is invoked when {@linkcode Protocol.close | close()} is called as well.
	*/
	onclose;
	/**
	* Callback for when an error occurs.
	*
	* Note that errors are not necessarily fatal; they are used for reporting any kind of exceptional condition out of band.
	*/
	onerror;
	/**
	* A handler to invoke for any request types that do not have their own handler installed.
	*/
	fallbackRequestHandler;
	/**
	* A handler to invoke for any notification types that do not have their own handler installed.
	*/
	fallbackNotificationHandler;
	constructor(_options) {
		this._options = _options;
		this._supportedProtocolVersions = _options?.supportedProtocolVersions ?? SUPPORTED_PROTOCOL_VERSIONS;
		this.setNotificationHandler("notifications/cancelled", (notification) => {
			this._oncancel(notification);
		});
		this.setNotificationHandler("notifications/progress", (notification) => {
			this._onprogress(notification);
		});
		this.setRequestHandler("ping", (_request) => ({}));
	}
	/**
	* Drop consult for inbound messages whose transport did not classify them
	* at the edge — long-lived channels such as stdio, where a role class may
	* need to decline traffic the negotiated era has no answer for (the
	* client-side inbound-request drop on modern-era connections: the
	* 2026-07-28 era has no server→client request channel, and on stdio the
	* client must never write JSON-RPC responses).
	*
	* Consulted ONLY when the transport supplied no
	* {@linkcode MessageExtraInfo.classification}: edge-classified traffic
	* never reaches the hook. Returning `'drop'` discards the message without
	* writing any response (requests are surfaced via `onerror`). The base
	* implementation returns `undefined`: unclassified traffic keeps today's
	* dispatch path unchanged. Era selection never happens here — era is
	* instance state, owned by the serving entry that constructed and
	* connected the instance.
	*/
	_shouldDropInbound(_message) {}
	/**
	* The per-request `_meta` envelope this instance attaches to every outgoing
	* request and notification, when one applies. The base implementation
	* returns `undefined` (no envelope — the 2025-era posture, so legacy-era
	* outbound traffic is byte-identical to a build without this seam).
	* `Client` overrides it on a connection that negotiated a modern (2026-07-28+)
	* era to return the reserved protocol-version / client-info /
	* client-capabilities keys. User-supplied `_meta` keys take precedence over
	* the auto-attached ones.
	*/
	_outboundMetaEnvelope() {}
	/**
	* Attach this instance's outbound `_meta` envelope (when one is configured)
	* to a request or notification. A no-op when the seam returns `undefined`
	* — the message returns by reference, so the legacy-era wire stays
	* byte-identical. User-supplied `_meta` keys are spread last so they win
	* over the auto-attached envelope keys.
	*/
	_envelopeOutbound(message) {
		const envelope = this._outboundMetaEnvelope();
		if (envelope === void 0) return message;
		const params = message.params ?? {};
		return {
			...message,
			params: {
				...params,
				_meta: {
					...envelope,
					...params._meta
				}
			}
		};
	}
	/**
	* Extension point for non-`complete` decoded results in the response
	* funnel: a result the wire codec discriminated into a kind other than
	* `'complete'` or `'invalid'` is handed here for the role class to
	* resolve. The base default surfaces it as a typed
	* {@linkcode SdkErrorCode.UnsupportedResultType} error (no retry).
	*
	* Intended consumers (named so the seam stays accountable):
	* - the `Client`'s multi-round-trip auto-fulfilment engine, which fulfils
	*   `'input_required'` results through the registered
	*   elicitation/sampling/roots handlers and retries via `flow.retry`;
	* - a future client-side terminal-result handler for
	*   `subscriptions/listen`, when the spec defines one.
	*
	* `Server` instances never receive `input_required` responses on their
	* outbound legs and leave the base behavior in place.
	*/
	_resolveNonCompleteResult(decoded, flow) {
		return Promise.reject(new SdkError(SdkErrorCode.UnsupportedResultType, `Unsupported result type '${decoded.kind}' for ${flow.request.method}`, {
			resultType: decoded.kind,
			method: flow.request.method
		}));
	}
	/**
	* Protected accessor for a registered request handler. Used by role
	* classes that dispatch synthesized requests through the same stored
	* handler chain (e.g. the `Client` fulfilling an embedded multi-round-trip
	* input request).
	*/
	_getRequestHandler(method) {
		return this._requestHandlers.get(method);
	}
	async _oncancel(notification) {
		if (notification.params.requestId === void 0) return;
		this._requestHandlerAbortControllers.get(notification.params.requestId)?.abort(notification.params.reason);
	}
	_setupTimeout(messageId, timeout, maxTotalTimeout, onTimeout, resetTimeoutOnProgress = false) {
		this._timeoutInfo.set(messageId, {
			timeoutId: setTimeout(onTimeout, timeout),
			startTime: Date.now(),
			timeout,
			maxTotalTimeout,
			resetTimeoutOnProgress,
			onTimeout
		});
	}
	_resetTimeout(messageId) {
		const info = this._timeoutInfo.get(messageId);
		if (!info) return false;
		const totalElapsed = Date.now() - info.startTime;
		if (info.maxTotalTimeout && totalElapsed >= info.maxTotalTimeout) {
			this._timeoutInfo.delete(messageId);
			throw new SdkError(SdkErrorCode.RequestTimeout, "Maximum total timeout exceeded", {
				maxTotalTimeout: info.maxTotalTimeout,
				totalElapsed
			});
		}
		clearTimeout(info.timeoutId);
		info.timeoutId = setTimeout(info.onTimeout, info.timeout);
		return true;
	}
	_cleanupTimeout(messageId) {
		const info = this._timeoutInfo.get(messageId);
		if (info) {
			clearTimeout(info.timeoutId);
			this._timeoutInfo.delete(messageId);
		}
	}
	/**
	* Attaches to the given transport, starts it, and starts listening for messages.
	*
	* The caller assumes ownership of the {@linkcode Transport}, replacing any callbacks that have already been set, and expects that it is the only user of the {@linkcode Transport} instance going forward.
	*/
	async connect(transport) {
		this._transport = transport;
		const _onclose = this.transport?.onclose;
		this._transport.onclose = () => {
			try {
				_onclose?.();
			} finally {
				this._onclose();
			}
		};
		const _onerror = this.transport?.onerror;
		this._transport.onerror = (error) => {
			_onerror?.(error);
			this._onerror(error);
		};
		const _onmessage = this._transport?.onmessage;
		this._transport.onmessage = (message, extra) => {
			_onmessage?.(message, extra);
			if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) this._onresponse(message);
			else if (isJSONRPCRequest(message)) this._onrequest(message, extra);
			else if (isJSONRPCNotification(message)) this._onnotification(message, extra);
			else this._onerror(/* @__PURE__ */ new Error(`Unknown message type: ${JSON.stringify(message)}`));
		};
		transport.setSupportedProtocolVersions?.(this._supportedProtocolVersions);
		await this._transport.start();
	}
	/**
	* Transport-close hook. Subclass overrides MUST call `super._onclose()`
	* after their own cleanup — base teardown (response-handler settlement,
	* timeout clearing, in-flight request abort) does not run otherwise.
	*/
	_onclose() {
		const responseHandlers = this._responseHandlers;
		this._responseHandlers = /* @__PURE__ */ new Map();
		this._progressHandlers.clear();
		this._pendingDebouncedNotifications.clear();
		for (const info of this._timeoutInfo.values()) clearTimeout(info.timeoutId);
		this._timeoutInfo.clear();
		const requestHandlerAbortControllers = this._requestHandlerAbortControllers;
		this._requestHandlerAbortControllers = /* @__PURE__ */ new Map();
		const error = new SdkError(SdkErrorCode.ConnectionClosed, "Connection closed");
		this._transport = void 0;
		try {
			this.onclose?.();
		} finally {
			for (const handler of responseHandlers.values()) handler(error);
			for (const controller of requestHandlerAbortControllers.values()) controller.abort(error);
		}
	}
	_onerror(error) {
		this.onerror?.(error);
	}
	/**
	* Inbound-notification dispatch. Subclass overrides MUST delegate
	* unmatched traffic to `super._onnotification(rawNotification, extra)` —
	* an override that consumes only what it owns and falls through to base
	* dispatch for everything else.
	*/
	_onnotification(rawNotification, extra) {
		const { message: notification } = liftWireOnlyMaterial(rawNotification, "notification");
		const codec = this._negotiatedWireCodec();
		if (extra?.classification === void 0 && this._shouldDropInbound(rawNotification) === "drop") return;
		if (extra?.classification !== void 0) {
			const classified = classifiedWireEra(extra.classification);
			if (classified !== codec.era) {
				this._onerror(/* @__PURE__ */ new Error(`Era mismatch on inbound notification '${notification.method}': classified as ${classified} but this instance serves ${codec.era}`));
				return;
			}
		}
		if (isSpecNotificationMethod(notification.method) && !codec.hasNotificationMethod(notification.method)) return;
		const handler = this._notificationHandlers.get(notification.method);
		const fallback = this.fallbackNotificationHandler;
		if (handler === void 0 && fallback === void 0) return;
		Promise.resolve().then(() => handler === void 0 ? fallback(notification) : handler(notification, codec)).catch((error) => this._onerror(/* @__PURE__ */ new Error(`Uncaught error in notification handler: ${error}`)));
	}
	_onrequest(rawRequest, extra) {
		const { message: request, lifted } = liftWireOnlyMaterial(rawRequest, "request");
		const codec = this._negotiatedWireCodec();
		if (extra?.classification === void 0 && this._shouldDropInbound(rawRequest) === "drop") {
			this._onerror(/* @__PURE__ */ new Error(`Dropped inbound request '${rawRequest.method}': not servable on this connection's protocol era`));
			return;
		}
		const capturedTransport = this._transport;
		const sendErrorResponse = (code, message, data) => {
			const errorResponse = {
				jsonrpc: "2.0",
				id: request.id,
				error: {
					code,
					message,
					...data !== void 0 && { data }
				}
			};
			capturedTransport?.send(errorResponse).catch((error) => this._onerror(/* @__PURE__ */ new Error(`Failed to send an error response: ${error}`)));
		};
		if (extra?.classification !== void 0) {
			const classified = classifiedWireEra(extra.classification);
			if (classified !== codec.era) {
				this._onerror(/* @__PURE__ */ new Error(`Era mismatch on inbound request '${request.method}': classified as ${classified} but this instance serves ${codec.era}`));
				const requested = extra.classification.revision ?? classified;
				sendErrorResponse(ProtocolErrorCode.UnsupportedProtocolVersion, `Unsupported protocol version: ${requested}`, {
					supported: this._supportedProtocolVersions,
					requested
				});
				return;
			}
		}
		if (isSpecRequestMethod(request.method) && !codec.hasRequestMethod(request.method) && !(isExtensionReusedRequestMethod(request.method) && this._customSchemaRequestMethods.has(request.method))) {
			sendErrorResponse(ProtocolErrorCode.MethodNotFound, "Method not found");
			return;
		}
		const handler = this._requestHandlers.get(request.method) ?? this.fallbackRequestHandler;
		if (handler === void 0) {
			sendErrorResponse(ProtocolErrorCode.MethodNotFound, "Method not found");
			return;
		}
		const envelopeError = codec.checkInboundEnvelope(lifted);
		if (envelopeError !== void 0) {
			sendErrorResponse(ProtocolErrorCode.InvalidParams, envelopeError);
			return;
		}
		const sendNotification = (notification, options) => this._notificationViaCodec(this._resolveOutboundCodec(notification.method), notification, {
			...options,
			relatedRequestId: request.id
		});
		const sendRequest = (r, resultSchema, options) => this._requestWithSchemaViaCodec(this._resolveOutboundCodec(r.method), r, resultSchema, {
			...options,
			relatedRequestId: request.id
		});
		const abortController = new AbortController();
		this._requestHandlerAbortControllers.set(request.id, abortController);
		const partitionedInputResponses = lifted.inputResponses === void 0 ? void 0 : partitionInputResponses(lifted.inputResponses);
		const baseCtx = {
			sessionId: capturedTransport?.sessionId,
			mcpReq: {
				id: request.id,
				method: request.method,
				_meta: request.params?._meta,
				...lifted.envelope !== void 0 && { envelope: lifted.envelope },
				...partitionedInputResponses !== void 0 && { inputResponses: partitionedInputResponses.accepted },
				...partitionedInputResponses !== void 0 && partitionedInputResponses.droppedKeys.length > 0 && { droppedInputResponseKeys: partitionedInputResponses.droppedKeys },
				requestState: lifted.requestState === void 0 ? NO_REQUEST_STATE : requestStateAccessor(lifted.requestState),
				signal: abortController.signal,
				send: ((r, schemaOrOptions, maybeOptions) => {
					const sendCodec = this._resolveOutboundCodec(r.method);
					this._assertOutboundRequestInEra(sendCodec, r.method);
					if (isStandardSchema(schemaOrOptions)) return sendRequest(r, schemaOrOptions, maybeOptions);
					const validate = codecResultValidator(sendCodec, r.method);
					if (validate === void 0) throw new TypeError(`'${r.method}' is not a spec method; pass a result schema as the second argument to ctx.mcpReq.send().`);
					return sendRequest(r, validate, schemaOrOptions);
				}),
				notify: sendNotification
			},
			http: extra?.authInfo ? { authInfo: extra.authInfo } : void 0
		};
		const ctx = this.buildContext(baseCtx, extra);
		Promise.resolve().then(() => handler(request, ctx)).then(async (result) => {
			if (abortController.signal.aborted) return;
			let encoded;
			try {
				encoded = codec.encodeResult(request.method, result, this._outboundServerInfo());
			} catch (error) {
				this._onerror(/* @__PURE__ */ new Error(`Failed to encode result for ${request.method}: ${error}`));
				sendErrorResponse(ProtocolErrorCode.InternalError, "Internal error");
				return;
			}
			const response = {
				result: encoded,
				jsonrpc: "2.0",
				id: request.id
			};
			await capturedTransport?.send(response);
		}, async (error) => {
			if (abortController.signal.aborted) return;
			const thrownCode = Number.isSafeInteger(error["code"]) ? error["code"] : ProtocolErrorCode.InternalError;
			const errorResponse = {
				jsonrpc: "2.0",
				id: request.id,
				error: {
					code: codec.encodeErrorCode(thrownCode),
					message: error.message ?? "Internal error",
					...error["data"] !== void 0 && { data: error["data"] }
				}
			};
			await capturedTransport?.send(errorResponse);
		}).catch((error) => this._onerror(/* @__PURE__ */ new Error(`Failed to send response: ${error}`))).finally(() => {
			if (this._requestHandlerAbortControllers.get(request.id) === abortController) this._requestHandlerAbortControllers.delete(request.id);
		});
	}
	_onprogress(notification) {
		const { progressToken, ...params } = notification.params;
		const messageId = Number(progressToken);
		const handler = this._progressHandlers.get(messageId);
		if (!handler) {
			this._onerror(/* @__PURE__ */ new Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`));
			return;
		}
		const responseHandler = this._responseHandlers.get(messageId);
		const timeoutInfo = this._timeoutInfo.get(messageId);
		if (timeoutInfo && responseHandler && timeoutInfo.resetTimeoutOnProgress) try {
			this._resetTimeout(messageId);
		} catch (error) {
			this._responseHandlers.delete(messageId);
			this._progressHandlers.delete(messageId);
			this._cleanupTimeout(messageId);
			responseHandler(error);
			return;
		}
		handler(params);
	}
	/**
	* Inbound-response dispatch. Subclass overrides MUST delegate unmatched
	* traffic to `super._onresponse(response)` — an override that consumes
	* only what it owns and falls through to base dispatch for everything
	* else.
	*/
	_onresponse(response) {
		const messageId = Number(response.id);
		const handler = this._responseHandlers.get(messageId);
		if (handler === void 0) {
			this._onerror(/* @__PURE__ */ new Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`));
			return;
		}
		this._responseHandlers.delete(messageId);
		this._cleanupTimeout(messageId);
		this._progressHandlers.delete(messageId);
		if (isJSONRPCResultResponse(response)) handler(response);
		else handler(ProtocolError.fromError(response.error.code, response.error.message, response.error.data));
	}
	get transport() {
		return this._transport;
	}
	/**
	* Closes the connection.
	*/
	async close() {
		await this._transport?.close();
	}
	request(request, schemaOrOptions, maybeOptions) {
		const codec = this._resolveOutboundCodec(request.method);
		if (isStandardSchema(schemaOrOptions)) {
			if (!isExtensionReusedRequestMethod(request.method)) this._assertOutboundRequestInEra(codec, request.method);
			return this._requestWithSchemaViaCodec(codec, request, schemaOrOptions, maybeOptions);
		}
		this._assertOutboundRequestInEra(codec, request.method);
		const validate = codecResultValidator(codec, request.method);
		if (validate === void 0) throw new TypeError(`'${request.method}' is not a spec method; pass a result schema as the second argument to request().`);
		return this._requestWithSchemaViaCodec(codec, request, validate, schemaOrOptions);
	}
	/**
	* The wire codec for this instance's negotiated era — the phase-2 truth:
	* everything an established connection sends and receives resolves
	* through it. Legacy until a version has been negotiated.
	*/
	_negotiatedWireCodec() {
		return codecForVersion(this._negotiatedProtocolVersion);
	}
	/**
	* Protected accessor for the instance's negotiated wire codec, for role
	* classes (Client/Server/McpServer) routing era-dependent behavior
	* through the codec's function-only surface — `samplingResultVariant`,
	* `outboundEnvelope`, `projectCallToolResult` — instead of branching on
	* the protocol version themselves.
	*/
	_wireCodec() {
		return this._negotiatedWireCodec();
	}
	/**
	* Outbound codec resolution: while the negotiated version is still unset
	* (the negotiation window), lifecycle messages are bootstrap-pinned BY
	* METHOD — they self-identify their era (`initialize` IS the legacy
	* handshake, `server/discover` IS the modern probe). Once a version has
	* been negotiated, the instance era is authoritative for everything — a
	* negotiated session never re-routes a method onto the other era.
	*/
	_resolveOutboundCodec(method) {
		if (this._negotiatedProtocolVersion === void 0) {
			const pinned = bootstrapOutboundCodec(method);
			if (pinned) return pinned;
		}
		return this._negotiatedWireCodec();
	}
	/**
	* Era gate for outbound requests — deletions are physical in BOTH
	* directions: sending a spec method that the resolved era does not define
	* dies locally with a typed error before anything reaches the transport.
	* Methods outside the spec universe are consumer-owned extension methods
	* and stay era-blind.
	*/
	_assertOutboundRequestInEra(codec, method) {
		if (isSpecRequestMethod(method) && !codec.hasRequestMethod(method)) throw new SdkError(SdkErrorCode.MethodNotSupportedByProtocolVersion, `Method '${method}' is not supported by the negotiated protocol version (wire era ${codec.era})`, {
			method,
			era: codec.era
		});
	}
	/**
	* Sends a request and waits for a response, using the provided schema for
	* validation instead of the era registry's method-keyed entry.
	*
	* This is the internal implementation used by SDK methods whose result
	* schema cannot be expressed as a method-keyed registry entry — the one
	* surviving case is `server.createMessage`, whose result schema depends
	* on the REQUEST params (tools vs no tools) — and by callers passing
	* explicit compatibility schemas. Spec methods are still era-gated here:
	* an explicit schema never smuggles a deleted method onto the wire.
	*/
	_requestWithSchema(request, resultSchema, options) {
		const codec = this._resolveOutboundCodec(request.method);
		this._assertOutboundRequestInEra(codec, request.method);
		return this._requestWithSchemaViaCodec(codec, request, resultSchema, options);
	}
	/**
	* The request funnel proper, keyed by the resolved era codec: the codec
	* owns result decoding (raw-first `resultType` discrimination — V-1 —
	* and the era's lift posture) before the schema validation step.
	*/
	_requestWithSchemaViaCodec(codec, request, resultSchema, options) {
		const { relatedRequestId, resumptionToken, onresumptiontoken, headers } = options ?? {};
		const flowStartedAt = Date.now();
		let onAbort;
		let cleanupMessageId;
		return new Promise((resolve, reject) => {
			const earlyReject = (error) => {
				reject(error);
			};
			if (!this._transport) {
				earlyReject(/* @__PURE__ */ new Error("Not connected"));
				return;
			}
			if (this._options?.enforceStrictCapabilities === true) try {
				this.assertCapabilityForMethod(request.method);
			} catch (error) {
				earlyReject(error);
				return;
			}
			if (options?.signal?.aborted) {
				const reason = options.signal.reason;
				throw reason instanceof SdkError ? reason : new SdkError(SdkErrorCode.RequestTimeout, String(reason));
			}
			const requestAbort = codec.era === "2026-07-28" && this._transport.hasPerRequestStream === true ? new AbortController() : void 0;
			const messageId = this._requestMessageId++;
			cleanupMessageId = messageId;
			const jsonrpcRequest = {
				...request,
				jsonrpc: "2.0",
				id: messageId
			};
			if (options?.onprogress) {
				this._progressHandlers.set(messageId, options.onprogress);
				jsonrpcRequest.params = {
					...request.params,
					_meta: {
						...request.params?._meta,
						progressToken: messageId
					}
				};
			}
			const outbound = this._envelopeOutbound(jsonrpcRequest);
			let responseReceived = false;
			const cancel = (reason) => {
				if (responseReceived) return;
				this._progressHandlers.delete(messageId);
				if (requestAbort === void 0) {
					if (request.method !== "initialize") this._transport?.send(this._envelopeOutbound({
						jsonrpc: "2.0",
						method: "notifications/cancelled",
						params: {
							requestId: messageId,
							reason: String(reason)
						}
					}), {
						relatedRequestId,
						resumptionToken,
						onresumptiontoken
					}).catch((error) => this._onerror(/* @__PURE__ */ new Error(`Failed to send cancellation: ${error}`)));
				} else requestAbort.abort();
				reject(reason instanceof SdkError ? reason : new SdkError(SdkErrorCode.RequestTimeout, String(reason)));
			};
			this._responseHandlers.set(messageId, (response) => {
				if (options?.signal?.aborted) return;
				responseReceived = true;
				if (response instanceof Error) return reject(response);
				let decoded;
				try {
					decoded = codec.decodeResult(request.method, response.result);
				} catch (error) {
					return reject(error instanceof Error ? error : new Error(String(error)));
				}
				if (decoded.kind === "invalid") return reject(decoded.error);
				if (decoded.kind === "input_required") {
					if (options?.allowInputRequired === true) return resolve(manualInputRequiredValue(decoded));
					const flow = {
						codec,
						request,
						resultSchema,
						options,
						flowStartedAt,
						retry: (params, legOptions) => this._requestWithSchemaViaCodec(codec, params === void 0 ? { method: request.method } : {
							method: request.method,
							params
						}, resultSchema, legOptions)
					};
					return resolve(this._resolveNonCompleteResult(decoded, flow));
				}
				const result = decoded.result;
				validateStandardSchema(resultSchema, result).then((parseResult) => {
					if (parseResult.success) resolve(parseResult.data);
					else reject(new SdkError(SdkErrorCode.InvalidResult, `Invalid result for ${request.method}: ${parseResult.error}`));
				}, reject);
			});
			onAbort = () => cancel(options?.signal?.reason);
			options?.signal?.addEventListener("abort", onAbort, { once: true });
			const timeout = options?.timeout ?? 6e4;
			const timeoutHandler = () => cancel(new SdkError(SdkErrorCode.RequestTimeout, "Request timed out", { timeout }));
			this._setupTimeout(messageId, timeout, options?.maxTotalTimeout, timeoutHandler, options?.resetTimeoutOnProgress ?? false);
			this._transport.send(outbound, {
				relatedRequestId,
				resumptionToken,
				onresumptiontoken,
				headers,
				requestSignal: requestAbort?.signal
			}).catch((error) => {
				this._progressHandlers.delete(messageId);
				reject(error);
			});
		}).finally(() => {
			if (onAbort) options?.signal?.removeEventListener("abort", onAbort);
			if (cleanupMessageId !== void 0) {
				this._responseHandlers.delete(cleanupMessageId);
				this._cleanupTimeout(cleanupMessageId);
			}
		});
	}
	/**
	* Emits a notification, which is a one-way message that does not expect a response.
	*/
	async notification(notification, options) {
		return await this._notificationViaCodec(this._resolveOutboundCodec(notification.method), notification, options);
	}
	/**
	* The notification funnel proper, keyed by the resolved era codec —
	* direct sends and related notifications (`ctx.mcpReq.notify`) alike
	* resolve through the instance's negotiated era at send time.
	*/
	async _notificationViaCodec(codec, notification, options) {
		if (!this._transport) throw new SdkError(SdkErrorCode.NotConnected, "Not connected");
		if (isSpecNotificationMethod(notification.method) && !codec.hasNotificationMethod(notification.method)) throw new SdkError(SdkErrorCode.MethodNotSupportedByProtocolVersion, `Notification '${notification.method}' is not supported by the negotiated protocol version (wire era ${codec.era})`, {
			method: notification.method,
			era: codec.era
		});
		this.assertNotificationCapability(notification.method);
		const jsonrpcNotification = this._envelopeOutbound({
			jsonrpc: "2.0",
			...notification
		});
		if ((this._options?.debouncedNotificationMethods ?? []).includes(notification.method) && !notification.params && options?.relatedRequestId === void 0) {
			if (this._pendingDebouncedNotifications.has(notification.method)) return;
			this._pendingDebouncedNotifications.add(notification.method);
			Promise.resolve().then(() => {
				this._pendingDebouncedNotifications.delete(notification.method);
				if (!this._transport) return;
				this._transport?.send(jsonrpcNotification, options).catch((error) => this._onerror(error));
			});
			return;
		}
		await this._transport.send(jsonrpcNotification, options);
	}
	setRequestHandler(method, schemasOrHandler, maybeHandler) {
		this.assertRequestHandlerCapability(method);
		let stored;
		if (typeof schemasOrHandler === "function") {
			if (!isSpecRequestMethod(method)) throw new TypeError(`'${method}' is not a spec request method; pass schemas as the second argument to setRequestHandler().`);
			stored = (request, ctx) => {
				const dispatchCodec = this._negotiatedWireCodec();
				let outcome = dispatchCodec.validateRequest(method, request);
				if (!outcome.ok && outcome.reason === "not-in-era") outcome = dispatchCodec.validateInputRequest(method, request);
				if (!outcome.ok) {
					if (outcome.reason === "not-in-era") throw new ProtocolError(ProtocolErrorCode.InternalError, `No wire schema for ${method} in the resolved era`);
					throw new Error(outcome.message);
				}
				return Promise.resolve(schemasOrHandler(outcome.value, ctx));
			};
		} else if (maybeHandler) stored = async (request, ctx) => {
			const parsed = await validateStandardSchema(schemasOrHandler.params, { ...request.params });
			if (!parsed.success) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Invalid params for ${method}: ${parsed.error}`);
			return maybeHandler(parsed.data, ctx);
		};
		else throw new TypeError("setRequestHandler: handler is required");
		if (typeof schemasOrHandler === "function") this._customSchemaRequestMethods.delete(method);
		else this._customSchemaRequestMethods.add(method);
		this._requestHandlers.set(method, this._wrapHandler(method, stored));
	}
	/**
	* Hook for subclasses to wrap a registered request handler with role-specific
	* validation or behavior (e.g. `Server` validates `tools/call` results, `Client`
	* validates `elicitation/create` mode and result). Runs for both the 2-arg and
	* 3-arg registration paths. The default implementation is identity.
	*
	* Subclasses overriding this hook avoid redeclaring `setRequestHandler`'s overload set.
	*/
	_wrapHandler(_method, handler) {
		return handler;
	}
	/**
	* Hook for subclasses to supply the implementation identity the 2026-era
	* encode seam stamps into outbound result `_meta` under
	* `io.modelcontextprotocol/serverInfo` (spec PR #3002: servers SHOULD
	* identify themselves on every response). The default is `undefined` — no
	* stamp. Only `Server` overrides this: the key identifies the software
	* producing a response, and the 2025-era codec never stamps anything
	* regardless (the never-stamp guarantee).
	*/
	_outboundServerInfo() {}
	/**
	* Removes the request handler for the given method.
	*/
	removeRequestHandler(method) {
		this._requestHandlers.delete(method);
		this._customSchemaRequestMethods.delete(method);
	}
	/**
	* Asserts that a request handler has not already been set for the given method, in preparation for a new one being automatically installed.
	*/
	assertCanSetRequestHandler(method) {
		if (this._requestHandlers.has(method)) throw new Error(`A request handler for ${method} already exists, which would be overridden`);
	}
	setNotificationHandler(method, schemasOrHandler, maybeHandler) {
		if (typeof schemasOrHandler === "function") {
			if (!isSpecNotificationMethod(method)) throw new TypeError(`'${method}' is not a spec notification method; pass schemas as the second argument to setNotificationHandler().`);
			this._notificationHandlers.set(method, (notification, codec) => {
				const outcome = codec.validateNotification(method, notification);
				if (!outcome.ok) {
					if (outcome.reason === "not-in-era") throw new ProtocolError(ProtocolErrorCode.InternalError, `No wire schema for ${method} in the resolved era`);
					throw new Error(outcome.message);
				}
				return Promise.resolve(schemasOrHandler(outcome.value));
			});
			return;
		}
		if (!maybeHandler) throw new TypeError("setNotificationHandler: handler is required");
		this._notificationHandlers.set(method, async (notification) => {
			const parsed = await validateStandardSchema(schemasOrHandler.params, { ...notification.params });
			if (!parsed.success) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Invalid params for notification ${method}: ${parsed.error}`);
			await maybeHandler(parsed.data, notification);
		});
	}
	/**
	* Removes the notification handler for the given method.
	*/
	removeNotificationHandler(method) {
		this._notificationHandlers.delete(method);
	}
};
function isPlainObject$1(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
function mergeCapabilities(base, additional) {
	const result = { ...base };
	for (const key in additional) {
		const k = key;
		const addValue = additional[k];
		if (addValue === void 0) continue;
		const baseValue = result[k];
		result[k] = isPlainObject$1(baseValue) && isPlainObject$1(addValue) ? {
			...baseValue,
			...addValue
		} : addValue;
	}
	return result;
}
function isPlainObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Splits a retried request's `inputResponses` map into the BARE response
* entries the spec defines and everything else. The spec's embedded responses
* are the bare result objects (an `ElicitResult`, `CreateMessageResult`, or
* `ListRootsResult`); a wrapped `{method, result}` envelope (a shape some
* peers emit) is never accepted as a response — its key is recorded so the
* handler can re-issue the corresponding input request.
*/
function partitionInputResponses(inputResponses) {
	const accepted = {};
	const droppedKeys = [];
	if (!isPlainObject(inputResponses)) return {
		accepted,
		droppedKeys
	};
	for (const [key, entry] of Object.entries(inputResponses)) {
		if (!isPlainObject(entry) || "method" in entry || "result" in entry) {
			droppedKeys.push(key);
			continue;
		}
		accepted[key] = entry;
	}
	return {
		accepted,
		droppedKeys
	};
}
/**
* Builds the manual-mode {@linkcode InputRequiredResult} value from the
* codec's decoded payload — what an `allowInputRequired: true` caller
* receives instead of the auto-fulfilled complete result.
*/
function manualInputRequiredValue(decoded) {
	return {
		resultType: "input_required",
		inputRequests: decoded.inputRequests,
		...decoded.requestState !== void 0 && { requestState: decoded.requestState },
		...decoded._meta !== void 0 && { _meta: decoded._meta }
	};
}
/*!
* content-type
* Copyright(c) 2015 Douglas Christopher Wilson
* MIT Licensed
*/
(/* @__PURE__ */ __commonJSMin(((exports) => {
	/**
	* RegExp to match *( ";" parameter ) in RFC 7231 sec 3.1.1.1
	*
	* parameter     = token "=" ( token / quoted-string )
	* token         = 1*tchar
	* tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
	*               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
	*               / DIGIT / ALPHA
	*               ; any VCHAR, except delimiters
	* quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
	* qdtext        = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
	* obs-text      = %x80-FF
	* quoted-pair   = "\" ( HTAB / SP / VCHAR / obs-text )
	*/
	var PARAM_REGEXP = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g;
	/**
	* RegExp to match quoted-pair in RFC 7230 sec 3.2.6
	*
	* quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
	* obs-text    = %x80-FF
	*/
	var QESC_REGEXP = /\\([\u000b\u0020-\u00ff])/g;
	/**
	* RegExp to match type in RFC 7231 sec 3.1.1.1
	*
	* media-type = type "/" subtype
	* type       = token
	* subtype    = token
	*/
	var TYPE_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
	exports.parse = parse;
	/**
	* Parse media type to object.
	*
	* @param {string|object} string
	* @return {Object}
	* @public
	*/
	function parse(string) {
		if (!string) throw new TypeError("argument string is required");
		var header = typeof string === "object" ? getcontenttype(string) : string;
		if (typeof header !== "string") throw new TypeError("argument string is required to be a string");
		var index = header.indexOf(";");
		var type = index !== -1 ? header.slice(0, index).trim() : header.trim();
		if (!TYPE_REGEXP.test(type)) throw new TypeError("invalid media type");
		var obj = new ContentType(type.toLowerCase());
		if (index !== -1) {
			var key;
			var match;
			var value;
			PARAM_REGEXP.lastIndex = index;
			while (match = PARAM_REGEXP.exec(header)) {
				if (match.index !== index) throw new TypeError("invalid parameter format");
				index += match[0].length;
				key = match[1].toLowerCase();
				value = match[2];
				if (value.charCodeAt(0) === 34) {
					value = value.slice(1, -1);
					if (value.indexOf("\\") !== -1) value = value.replace(QESC_REGEXP, "$1");
				}
				obj.parameters[key] = value;
			}
			if (index !== header.length) throw new TypeError("invalid parameter format");
		}
		return obj;
	}
	/**
	* Get content-type from req/res objects.
	*
	* @param {object}
	* @return {Object}
	* @private
	*/
	function getcontenttype(obj) {
		var header;
		if (typeof obj.getHeader === "function") header = obj.getHeader("content-type");
		else if (typeof obj.headers === "object") header = obj.headers && obj.headers["content-type"];
		if (typeof header !== "string") throw new TypeError("content-type header is missing from object");
		return header;
	}
	/**
	* Class to represent a content type.
	* @private
	*/
	function ContentType(type) {
		this.parameters = Object.create(null);
		this.type = type;
	}
})))();
/**
* Buffers a continuous stdio stream into discrete JSON-RPC messages.
*/
var ReadBuffer = class {
	_buffer;
	_maxBufferSize;
	constructor(options) {
		this._maxBufferSize = options?.maxBufferSize ?? 10485760;
	}
	append(chunk) {
		if ((this._buffer?.length ?? 0) + chunk.length > this._maxBufferSize) {
			this.clear();
			throw new Error(`ReadBuffer exceeded maximum size of ${this._maxBufferSize} bytes`);
		}
		this._buffer = this._buffer ? Buffer.concat([this._buffer, chunk]) : chunk;
	}
	readMessage() {
		while (this._buffer) {
			const index = this._buffer.indexOf("\n");
			if (index === -1) return null;
			const line = this._buffer.toString("utf8", 0, index).replace(/\r$/, "");
			this._buffer = this._buffer.subarray(index + 1);
			try {
				return deserializeMessage(line);
			} catch (error) {
				if (error instanceof SyntaxError) continue;
				throw error;
			}
		}
		return null;
	}
	clear() {
		this._buffer = void 0;
	}
};
function deserializeMessage(line) {
	return JSONRPCMessageSchema.parse(JSON.parse(line));
}
function serializeMessage(message) {
	return JSON.stringify(message) + "\n";
}
/**
* Tool name validation utilities according to SEP: Specify Format for Tool Names
*
* Tool names SHOULD be between 1 and 128 characters in length (inclusive).
* Tool names are case-sensitive.
* Allowed characters: uppercase and lowercase ASCII letters (`A-Z`, `a-z`), digits
* (`0-9`), underscore (`_`), dash (`-`), and dot (`.`).
* Tool names SHOULD NOT contain spaces, commas, or other special characters.
*
* @see {@link https://github.com/modelcontextprotocol/modelcontextprotocol/issues/986 | SEP-986: Specify Format for Tool Names}
*/
/**
* Regular expression for valid tool names according to SEP-986 specification
*/
const TOOL_NAME_REGEX = /^[A-Za-z0-9._-]{1,128}$/;
/**
* Validates a tool name according to the SEP specification
* @param name - The tool name to validate
* @returns An object containing validation result and any warnings
*/
function validateToolName(name) {
	const warnings = [];
	if (name.length === 0) return {
		isValid: false,
		warnings: ["Tool name cannot be empty"]
	};
	if (name.length > 128) return {
		isValid: false,
		warnings: [`Tool name exceeds maximum length of 128 characters (current: ${name.length})`]
	};
	if (name.includes(" ")) warnings.push("Tool name contains spaces, which may cause parsing issues");
	if (name.includes(",")) warnings.push("Tool name contains commas, which may cause parsing issues");
	if (name.startsWith("-") || name.endsWith("-")) warnings.push("Tool name starts or ends with a dash, which may cause parsing issues in some contexts");
	if (name.startsWith(".") || name.endsWith(".")) warnings.push("Tool name starts or ends with a dot, which may cause parsing issues in some contexts");
	if (!TOOL_NAME_REGEX.test(name)) {
		const invalidChars = [...name].filter((char) => !/[A-Za-z0-9._-]/.test(char)).filter((char, index, arr) => arr.indexOf(char) === index);
		warnings.push(`Tool name contains invalid characters: ${invalidChars.map((c) => `"${c}"`).join(", ")}`, "Allowed characters are: A-Z, a-z, 0-9, underscore (_), dash (-), and dot (.)");
		return {
			isValid: false,
			warnings
		};
	}
	return {
		isValid: true,
		warnings
	};
}
/**
* Issues warnings for non-conforming tool names
* @param name - The tool name that triggered the warnings
* @param warnings - Array of warning messages
*/
function issueToolNameWarning(name, warnings) {
	if (warnings.length > 0) {
		console.warn(`Tool name validation warning for "${name}":`);
		for (const warning of warnings) console.warn(`  - ${warning}`);
		console.warn("Tool registration will proceed, but this may cause compatibility issues.");
		console.warn("Consider updating the tool name to conform to the MCP tool naming standard.");
		console.warn("See SEP: Specify Format for Tool Names (https://github.com/modelcontextprotocol/modelcontextprotocol/issues/986) for more details.");
	}
}
/**
* Validates a tool name and issues warnings for non-conforming names
* @param name - The tool name to validate
* @returns `true` if the name is valid, `false` otherwise
*/
function validateAndWarnToolName(name) {
	const result = validateToolName(name);
	issueToolNameWarning(name, result.warnings);
	return result.isValid;
}
/**
* Zod-specific helpers for the v1-compat raw-shape shorthand on
* `registerTool`/`registerPrompt`. Kept separate from `standardSchema.ts` so
* that file stays library-agnostic per the Standard Schema spec.
*/
function isZodV4Schema(v) {
	return typeof v === "object" && v !== null && "_zod" in v;
}
function looksLikeZodV3(v) {
	return typeof v === "object" && v !== null && !("_zod" in v) && "_def" in v && typeof v._def?.typeName === "string";
}
/**
* Detects a "raw shape" — a plain object whose values are Zod field schemas,
* e.g. `{ name: z.string() }`. Powers the auto-wrap in
* {@linkcode normalizeRawShapeSchema}, which wraps with `z.object()`, so only
* Zod values are supported.
*
* @internal
*/
function isZodRawShape(obj) {
	if (typeof obj !== "object" || obj === null) return false;
	if (isStandardSchema(obj)) return false;
	const proto = Object.getPrototypeOf(obj);
	if (proto !== Object.prototype && proto !== null) return false;
	return Object.values(obj).every((v) => isZodV4Schema(v));
}
/**
* Accepts either a {@linkcode StandardSchemaWithJSON} or a raw Zod shape
* `{ field: z.string() }` and returns a {@linkcode StandardSchemaWithJSON}.
* Raw shapes are wrapped with `z.object()` so the rest of the pipeline sees a
* uniform schema type; already-wrapped schemas pass through unchanged.
*
* @internal
*/
function normalizeRawShapeSchema(schema) {
	if (schema === void 0) return void 0;
	if (isZodRawShape(schema)) return object(schema);
	if (typeof schema === "object" && schema !== null && !isStandardSchema(schema) && Object.values(schema).some((v) => looksLikeZodV3(v))) throw new TypeError("Raw-shape inputSchema/outputSchema/argsSchema fields must be Zod v4 schemas. Got a Zod v3 field schema. Import from `zod/v4` (or upgrade your zod import), or wrap with `z.object({...})` yourself.");
	if (!isStandardSchema(schema)) throw new TypeError("inputSchema/outputSchema/argsSchema must be a Standard Schema (e.g. z.object({...})) or a raw Zod shape ({ field: z.string() }).");
	return schema;
}
//#endregion
//#region node_modules/@modelcontextprotocol/server/dist/cfWorkerProvider-p3WaZPqB.mjs
function deepCompareStrict(a, b) {
	const typeofa = typeof a;
	if (typeofa !== typeof b) return false;
	if (Array.isArray(a)) {
		if (!Array.isArray(b)) return false;
		const length = a.length;
		if (length !== b.length) return false;
		for (let i = 0; i < length; i++) if (!deepCompareStrict(a[i], b[i])) return false;
		return true;
	}
	if (typeofa === "object") {
		if (!a || !b) return a === b;
		const aKeys = Object.keys(a);
		const bKeys = Object.keys(b);
		if (aKeys.length !== bKeys.length) return false;
		for (const k of aKeys) if (!deepCompareStrict(a[k], b[k])) return false;
		return true;
	}
	return a === b;
}
function encodePointer(p) {
	return encodeURI(escapePointer(p));
}
function escapePointer(p) {
	return p.replace(/~/g, "~0").replace(/\//g, "~1");
}
const schemaArrayKeyword = {
	prefixItems: true,
	items: true,
	allOf: true,
	anyOf: true,
	oneOf: true
};
const schemaMapKeyword = {
	$defs: true,
	definitions: true,
	properties: true,
	patternProperties: true,
	dependentSchemas: true
};
const ignoredKeyword = {
	id: true,
	$id: true,
	$ref: true,
	$schema: true,
	$anchor: true,
	$vocabulary: true,
	$comment: true,
	default: true,
	enum: true,
	const: true,
	required: true,
	type: true,
	maximum: true,
	minimum: true,
	exclusiveMaximum: true,
	exclusiveMinimum: true,
	multipleOf: true,
	maxLength: true,
	minLength: true,
	pattern: true,
	format: true,
	maxItems: true,
	minItems: true,
	uniqueItems: true,
	maxProperties: true,
	minProperties: true
};
let initialBaseURI = typeof self !== "undefined" && self.location && self.location.origin !== "null" ? new URL(self.location.origin + self.location.pathname + location.search) : new URL("https://github.com/cfworker");
function dereference(schema, lookup = Object.create(null), baseURI = initialBaseURI, basePointer = "") {
	if (schema && typeof schema === "object" && !Array.isArray(schema)) {
		const id = schema.$id || schema.id;
		if (id) {
			const url = new URL(id, baseURI.href);
			if (url.hash.length > 1) lookup[url.href] = schema;
			else {
				url.hash = "";
				if (basePointer === "") baseURI = url;
				else dereference(schema, lookup, baseURI);
			}
		}
	} else if (schema !== true && schema !== false) return lookup;
	const schemaURI = baseURI.href + (basePointer ? "#" + basePointer : "");
	if (lookup[schemaURI] !== void 0) throw new Error(`Duplicate schema URI "${schemaURI}".`);
	lookup[schemaURI] = schema;
	if (schema === true || schema === false) return lookup;
	if (schema.__absolute_uri__ === void 0) Object.defineProperty(schema, "__absolute_uri__", {
		enumerable: false,
		value: schemaURI
	});
	if (schema.$ref && schema.__absolute_ref__ === void 0) {
		const url = new URL(schema.$ref, baseURI.href);
		url.hash = url.hash;
		Object.defineProperty(schema, "__absolute_ref__", {
			enumerable: false,
			value: url.href
		});
	}
	if (schema.$recursiveRef && schema.__absolute_recursive_ref__ === void 0) {
		const url = new URL(schema.$recursiveRef, baseURI.href);
		url.hash = url.hash;
		Object.defineProperty(schema, "__absolute_recursive_ref__", {
			enumerable: false,
			value: url.href
		});
	}
	if (schema.$anchor) {
		const url = new URL("#" + schema.$anchor, baseURI.href);
		lookup[url.href] = schema;
	}
	for (let key in schema) {
		if (ignoredKeyword[key]) continue;
		const keyBase = `${basePointer}/${encodePointer(key)}`;
		const subSchema = schema[key];
		if (Array.isArray(subSchema)) {
			if (schemaArrayKeyword[key]) {
				const length = subSchema.length;
				for (let i = 0; i < length; i++) dereference(subSchema[i], lookup, baseURI, `${keyBase}/${i}`);
			}
		} else if (schemaMapKeyword[key]) for (let subKey in subSchema) dereference(subSchema[subKey], lookup, baseURI, `${keyBase}/${encodePointer(subKey)}`);
		else dereference(subSchema, lookup, baseURI, keyBase);
	}
	return lookup;
}
const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
const DAYS = [
	0,
	31,
	28,
	31,
	30,
	31,
	30,
	31,
	31,
	30,
	31,
	30,
	31
];
const TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
const HOSTNAME = /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i;
const URIREF = /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
const URITEMPLATE = /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i;
const URL_ = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)(?:\.(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu;
const UUID = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
const JSON_POINTER_URI_FRAGMENT = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i;
const RELATIVE_JSON_POINTER = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/;
const EMAIL = (input) => {
	if (input[0] === "\"") return false;
	const [name, host, ...rest] = input.split("@");
	if (!name || !host || rest.length !== 0 || name.length > 64 || host.length > 253) return false;
	if (name[0] === "." || name.endsWith(".") || name.includes("..")) return false;
	if (!/^[a-z0-9.-]+$/i.test(host) || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(name)) return false;
	return host.split(".").every((part) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(part));
};
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IPV6 = /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i;
const DURATION = (input) => input.length > 1 && input.length < 80 && (/^P\d+([.,]\d+)?W$/.test(input) || /^P[\dYMDTHS]*(\d[.,]\d+)?[YMDHS]$/.test(input) && /^P([.,\d]+Y)?([.,\d]+M)?([.,\d]+D)?(T([.,\d]+H)?([.,\d]+M)?([.,\d]+S)?)?$/.test(input));
function bind(r) {
	return r.test.bind(r);
}
const format = {
	date,
	time: time.bind(void 0, false),
	"date-time": date_time,
	duration: DURATION,
	uri,
	"uri-reference": bind(URIREF),
	"uri-template": bind(URITEMPLATE),
	url: bind(URL_),
	email: EMAIL,
	hostname: bind(HOSTNAME),
	ipv4: bind(IPV4),
	ipv6: bind(IPV6),
	regex,
	uuid: bind(UUID),
	"json-pointer": bind(JSON_POINTER),
	"json-pointer-uri-fragment": bind(JSON_POINTER_URI_FRAGMENT),
	"relative-json-pointer": bind(RELATIVE_JSON_POINTER)
};
function isLeapYear(year) {
	return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function date(str) {
	const matches = str.match(DATE);
	if (!matches) return false;
	const year = +matches[1];
	const month = +matches[2];
	const day = +matches[3];
	return month >= 1 && month <= 12 && day >= 1 && day <= (month == 2 && isLeapYear(year) ? 29 : DAYS[month]);
}
function time(full, str) {
	const matches = str.match(TIME);
	if (!matches) return false;
	const hour = +matches[1];
	const minute = +matches[2];
	const second = +matches[3];
	const timeZone = !!matches[5];
	return (hour <= 23 && minute <= 59 && second <= 59 || hour == 23 && minute == 59 && second == 60) && (!full || timeZone);
}
const DATE_TIME_SEPARATOR = /t|\s/i;
function date_time(str) {
	const dateTime = str.split(DATE_TIME_SEPARATOR);
	return dateTime.length == 2 && date(dateTime[0]) && time(true, dateTime[1]);
}
const NOT_URI_FRAGMENT = /\/|:/;
const URI_PATTERN = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
function uri(str) {
	return NOT_URI_FRAGMENT.test(str) && URI_PATTERN.test(str);
}
const Z_ANCHOR = /[^\\]\\Z/;
function regex(str) {
	if (Z_ANCHOR.test(str)) return false;
	try {
		new RegExp(str, "u");
		return true;
	} catch (e) {
		return false;
	}
}
function ucs2length(s) {
	let result = 0;
	let length = s.length;
	let index = 0;
	let charCode;
	while (index < length) {
		result++;
		charCode = s.charCodeAt(index++);
		if (charCode >= 55296 && charCode <= 56319 && index < length) {
			charCode = s.charCodeAt(index);
			if ((charCode & 64512) == 56320) index++;
		}
	}
	return result;
}
function validate(instance, schema, draft = "2019-09", lookup = dereference(schema), shortCircuit = true, recursiveAnchor = null, instanceLocation = "#", schemaLocation = "#", evaluated = Object.create(null)) {
	if (schema === true) return {
		valid: true,
		errors: []
	};
	if (schema === false) return {
		valid: false,
		errors: [{
			instanceLocation,
			keyword: "false",
			keywordLocation: instanceLocation,
			error: "False boolean schema."
		}]
	};
	const rawInstanceType = typeof instance;
	let instanceType;
	switch (rawInstanceType) {
		case "boolean":
		case "number":
		case "string":
			instanceType = rawInstanceType;
			break;
		case "object":
			if (instance === null) instanceType = "null";
			else if (Array.isArray(instance)) instanceType = "array";
			else instanceType = "object";
			break;
		default: throw new Error(`Instances of "${rawInstanceType}" type are not supported.`);
	}
	const { $ref, $recursiveRef, $recursiveAnchor, type: $type, const: $const, enum: $enum, required: $required, not: $not, anyOf: $anyOf, allOf: $allOf, oneOf: $oneOf, if: $if, then: $then, else: $else, format: $format, properties: $properties, patternProperties: $patternProperties, additionalProperties: $additionalProperties, unevaluatedProperties: $unevaluatedProperties, minProperties: $minProperties, maxProperties: $maxProperties, propertyNames: $propertyNames, dependentRequired: $dependentRequired, dependentSchemas: $dependentSchemas, dependencies: $dependencies, prefixItems: $prefixItems, items: $items, additionalItems: $additionalItems, unevaluatedItems: $unevaluatedItems, contains: $contains, minContains: $minContains, maxContains: $maxContains, minItems: $minItems, maxItems: $maxItems, uniqueItems: $uniqueItems, minimum: $minimum, maximum: $maximum, exclusiveMinimum: $exclusiveMinimum, exclusiveMaximum: $exclusiveMaximum, multipleOf: $multipleOf, minLength: $minLength, maxLength: $maxLength, pattern: $pattern, __absolute_ref__, __absolute_recursive_ref__ } = schema;
	const errors = [];
	if ($recursiveAnchor === true && recursiveAnchor === null) recursiveAnchor = schema;
	if ($recursiveRef === "#") {
		const refSchema = recursiveAnchor === null ? lookup[__absolute_recursive_ref__] : recursiveAnchor;
		const keywordLocation = `${schemaLocation}/$recursiveRef`;
		const result = validate(instance, recursiveAnchor === null ? schema : recursiveAnchor, draft, lookup, shortCircuit, refSchema, instanceLocation, keywordLocation, evaluated);
		if (!result.valid) errors.push({
			instanceLocation,
			keyword: "$recursiveRef",
			keywordLocation,
			error: "A subschema had errors."
		}, ...result.errors);
	}
	if ($ref !== void 0) {
		const refSchema = lookup[__absolute_ref__ || $ref];
		if (refSchema === void 0) {
			let message = `Unresolved $ref "${$ref}".`;
			if (__absolute_ref__ && __absolute_ref__ !== $ref) message += `  Absolute URI "${__absolute_ref__}".`;
			message += `\nKnown schemas:\n- ${Object.keys(lookup).join("\n- ")}`;
			throw new Error(message);
		}
		const keywordLocation = `${schemaLocation}/$ref`;
		const result = validate(instance, refSchema, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, keywordLocation, evaluated);
		if (!result.valid) errors.push({
			instanceLocation,
			keyword: "$ref",
			keywordLocation,
			error: "A subschema had errors."
		}, ...result.errors);
		if (draft === "4" || draft === "7") return {
			valid: errors.length === 0,
			errors
		};
	}
	if (Array.isArray($type)) {
		let length = $type.length;
		let valid = false;
		for (let i = 0; i < length; i++) if (instanceType === $type[i] || $type[i] === "integer" && instanceType === "number" && instance % 1 === 0 && instance === instance) {
			valid = true;
			break;
		}
		if (!valid) errors.push({
			instanceLocation,
			keyword: "type",
			keywordLocation: `${schemaLocation}/type`,
			error: `Instance type "${instanceType}" is invalid. Expected "${$type.join("\", \"")}".`
		});
	} else if ($type === "integer") {
		if (instanceType !== "number" || instance % 1 || instance !== instance) errors.push({
			instanceLocation,
			keyword: "type",
			keywordLocation: `${schemaLocation}/type`,
			error: `Instance type "${instanceType}" is invalid. Expected "${$type}".`
		});
	} else if ($type !== void 0 && instanceType !== $type) errors.push({
		instanceLocation,
		keyword: "type",
		keywordLocation: `${schemaLocation}/type`,
		error: `Instance type "${instanceType}" is invalid. Expected "${$type}".`
	});
	if ($const !== void 0) {
		if (instanceType === "object" || instanceType === "array") {
			if (!deepCompareStrict(instance, $const)) errors.push({
				instanceLocation,
				keyword: "const",
				keywordLocation: `${schemaLocation}/const`,
				error: `Instance does not match ${JSON.stringify($const)}.`
			});
		} else if (instance !== $const) errors.push({
			instanceLocation,
			keyword: "const",
			keywordLocation: `${schemaLocation}/const`,
			error: `Instance does not match ${JSON.stringify($const)}.`
		});
	}
	if ($enum !== void 0) {
		if (instanceType === "object" || instanceType === "array") {
			if (!$enum.some((value) => deepCompareStrict(instance, value))) errors.push({
				instanceLocation,
				keyword: "enum",
				keywordLocation: `${schemaLocation}/enum`,
				error: `Instance does not match any of ${JSON.stringify($enum)}.`
			});
		} else if (!$enum.some((value) => instance === value)) errors.push({
			instanceLocation,
			keyword: "enum",
			keywordLocation: `${schemaLocation}/enum`,
			error: `Instance does not match any of ${JSON.stringify($enum)}.`
		});
	}
	if ($not !== void 0) {
		const keywordLocation = `${schemaLocation}/not`;
		if (validate(instance, $not, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, keywordLocation).valid) errors.push({
			instanceLocation,
			keyword: "not",
			keywordLocation,
			error: "Instance matched \"not\" schema."
		});
	}
	let subEvaluateds = [];
	if ($anyOf !== void 0) {
		const keywordLocation = `${schemaLocation}/anyOf`;
		const errorsLength = errors.length;
		let anyValid = false;
		for (let i = 0; i < $anyOf.length; i++) {
			const subSchema = $anyOf[i];
			const subEvaluated = Object.create(evaluated);
			const result = validate(instance, subSchema, draft, lookup, shortCircuit, $recursiveAnchor === true ? recursiveAnchor : null, instanceLocation, `${keywordLocation}/${i}`, subEvaluated);
			errors.push(...result.errors);
			anyValid = anyValid || result.valid;
			if (result.valid) subEvaluateds.push(subEvaluated);
		}
		if (anyValid) errors.length = errorsLength;
		else errors.splice(errorsLength, 0, {
			instanceLocation,
			keyword: "anyOf",
			keywordLocation,
			error: "Instance does not match any subschemas."
		});
	}
	if ($allOf !== void 0) {
		const keywordLocation = `${schemaLocation}/allOf`;
		const errorsLength = errors.length;
		let allValid = true;
		for (let i = 0; i < $allOf.length; i++) {
			const subSchema = $allOf[i];
			const subEvaluated = Object.create(evaluated);
			const result = validate(instance, subSchema, draft, lookup, shortCircuit, $recursiveAnchor === true ? recursiveAnchor : null, instanceLocation, `${keywordLocation}/${i}`, subEvaluated);
			errors.push(...result.errors);
			allValid = allValid && result.valid;
			if (result.valid) subEvaluateds.push(subEvaluated);
		}
		if (allValid) errors.length = errorsLength;
		else errors.splice(errorsLength, 0, {
			instanceLocation,
			keyword: "allOf",
			keywordLocation,
			error: `Instance does not match every subschema.`
		});
	}
	if ($oneOf !== void 0) {
		const keywordLocation = `${schemaLocation}/oneOf`;
		const errorsLength = errors.length;
		const matches = $oneOf.filter((subSchema, i) => {
			const subEvaluated = Object.create(evaluated);
			const result = validate(instance, subSchema, draft, lookup, shortCircuit, $recursiveAnchor === true ? recursiveAnchor : null, instanceLocation, `${keywordLocation}/${i}`, subEvaluated);
			errors.push(...result.errors);
			if (result.valid) subEvaluateds.push(subEvaluated);
			return result.valid;
		}).length;
		if (matches === 1) errors.length = errorsLength;
		else errors.splice(errorsLength, 0, {
			instanceLocation,
			keyword: "oneOf",
			keywordLocation,
			error: `Instance does not match exactly one subschema (${matches} matches).`
		});
	}
	if (instanceType === "object" || instanceType === "array") Object.assign(evaluated, ...subEvaluateds);
	if ($if !== void 0) {
		const keywordLocation = `${schemaLocation}/if`;
		if (validate(instance, $if, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, keywordLocation, evaluated).valid) {
			if ($then !== void 0) {
				const thenResult = validate(instance, $then, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${schemaLocation}/then`, evaluated);
				if (!thenResult.valid) errors.push({
					instanceLocation,
					keyword: "if",
					keywordLocation,
					error: `Instance does not match "then" schema.`
				}, ...thenResult.errors);
			}
		} else if ($else !== void 0) {
			const elseResult = validate(instance, $else, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${schemaLocation}/else`, evaluated);
			if (!elseResult.valid) errors.push({
				instanceLocation,
				keyword: "if",
				keywordLocation,
				error: `Instance does not match "else" schema.`
			}, ...elseResult.errors);
		}
	}
	if (instanceType === "object") {
		if ($required !== void 0) {
			for (const key of $required) if (!(key in instance)) errors.push({
				instanceLocation,
				keyword: "required",
				keywordLocation: `${schemaLocation}/required`,
				error: `Instance does not have required property "${key}".`
			});
		}
		const keys = Object.keys(instance);
		if ($minProperties !== void 0 && keys.length < $minProperties) errors.push({
			instanceLocation,
			keyword: "minProperties",
			keywordLocation: `${schemaLocation}/minProperties`,
			error: `Instance does not have at least ${$minProperties} properties.`
		});
		if ($maxProperties !== void 0 && keys.length > $maxProperties) errors.push({
			instanceLocation,
			keyword: "maxProperties",
			keywordLocation: `${schemaLocation}/maxProperties`,
			error: `Instance does not have at least ${$maxProperties} properties.`
		});
		if ($propertyNames !== void 0) {
			const keywordLocation = `${schemaLocation}/propertyNames`;
			for (const key in instance) {
				const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
				const result = validate(key, $propertyNames, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, keywordLocation);
				if (!result.valid) errors.push({
					instanceLocation,
					keyword: "propertyNames",
					keywordLocation,
					error: `Property name "${key}" does not match schema.`
				}, ...result.errors);
			}
		}
		if ($dependentRequired !== void 0) {
			const keywordLocation = `${schemaLocation}/dependantRequired`;
			for (const key in $dependentRequired) if (key in instance) {
				const required = $dependentRequired[key];
				for (const dependantKey of required) if (!(dependantKey in instance)) errors.push({
					instanceLocation,
					keyword: "dependentRequired",
					keywordLocation,
					error: `Instance has "${key}" but does not have "${dependantKey}".`
				});
			}
		}
		if ($dependentSchemas !== void 0) for (const key in $dependentSchemas) {
			const keywordLocation = `${schemaLocation}/dependentSchemas`;
			if (key in instance) {
				const result = validate(instance, $dependentSchemas[key], draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${keywordLocation}/${encodePointer(key)}`, evaluated);
				if (!result.valid) errors.push({
					instanceLocation,
					keyword: "dependentSchemas",
					keywordLocation,
					error: `Instance has "${key}" but does not match dependant schema.`
				}, ...result.errors);
			}
		}
		if ($dependencies !== void 0) {
			const keywordLocation = `${schemaLocation}/dependencies`;
			for (const key in $dependencies) if (key in instance) {
				const propsOrSchema = $dependencies[key];
				if (Array.isArray(propsOrSchema)) {
					for (const dependantKey of propsOrSchema) if (!(dependantKey in instance)) errors.push({
						instanceLocation,
						keyword: "dependencies",
						keywordLocation,
						error: `Instance has "${key}" but does not have "${dependantKey}".`
					});
				} else {
					const result = validate(instance, propsOrSchema, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${keywordLocation}/${encodePointer(key)}`);
					if (!result.valid) errors.push({
						instanceLocation,
						keyword: "dependencies",
						keywordLocation,
						error: `Instance has "${key}" but does not match dependant schema.`
					}, ...result.errors);
				}
			}
		}
		const thisEvaluated = Object.create(null);
		let stop = false;
		if ($properties !== void 0) {
			const keywordLocation = `${schemaLocation}/properties`;
			for (const key in $properties) {
				if (!(key in instance)) continue;
				const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
				const result = validate(instance[key], $properties[key], draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, `${keywordLocation}/${encodePointer(key)}`);
				if (result.valid) evaluated[key] = thisEvaluated[key] = true;
				else {
					stop = shortCircuit;
					errors.push({
						instanceLocation,
						keyword: "properties",
						keywordLocation,
						error: `Property "${key}" does not match schema.`
					}, ...result.errors);
					if (stop) break;
				}
			}
		}
		if (!stop && $patternProperties !== void 0) {
			const keywordLocation = `${schemaLocation}/patternProperties`;
			for (const pattern in $patternProperties) {
				const regex$1 = new RegExp(pattern, "u");
				const subSchema = $patternProperties[pattern];
				for (const key in instance) {
					if (!regex$1.test(key)) continue;
					const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
					const result = validate(instance[key], subSchema, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, `${keywordLocation}/${encodePointer(pattern)}`);
					if (result.valid) evaluated[key] = thisEvaluated[key] = true;
					else {
						stop = shortCircuit;
						errors.push({
							instanceLocation,
							keyword: "patternProperties",
							keywordLocation,
							error: `Property "${key}" matches pattern "${pattern}" but does not match associated schema.`
						}, ...result.errors);
					}
				}
			}
		}
		if (!stop && $additionalProperties !== void 0) {
			const keywordLocation = `${schemaLocation}/additionalProperties`;
			for (const key in instance) {
				if (thisEvaluated[key]) continue;
				const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
				const result = validate(instance[key], $additionalProperties, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, keywordLocation);
				if (result.valid) evaluated[key] = true;
				else {
					stop = shortCircuit;
					errors.push({
						instanceLocation,
						keyword: "additionalProperties",
						keywordLocation,
						error: `Property "${key}" does not match additional properties schema.`
					}, ...result.errors);
				}
			}
		} else if (!stop && $unevaluatedProperties !== void 0) {
			const keywordLocation = `${schemaLocation}/unevaluatedProperties`;
			for (const key in instance) if (!evaluated[key]) {
				const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
				const result = validate(instance[key], $unevaluatedProperties, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, keywordLocation);
				if (result.valid) evaluated[key] = true;
				else errors.push({
					instanceLocation,
					keyword: "unevaluatedProperties",
					keywordLocation,
					error: `Property "${key}" does not match unevaluated properties schema.`
				}, ...result.errors);
			}
		}
	} else if (instanceType === "array") {
		if ($maxItems !== void 0 && instance.length > $maxItems) errors.push({
			instanceLocation,
			keyword: "maxItems",
			keywordLocation: `${schemaLocation}/maxItems`,
			error: `Array has too many items (${instance.length} > ${$maxItems}).`
		});
		if ($minItems !== void 0 && instance.length < $minItems) errors.push({
			instanceLocation,
			keyword: "minItems",
			keywordLocation: `${schemaLocation}/minItems`,
			error: `Array has too few items (${instance.length} < ${$minItems}).`
		});
		const length = instance.length;
		let i = 0;
		let stop = false;
		if ($prefixItems !== void 0) {
			const keywordLocation = `${schemaLocation}/prefixItems`;
			const length2 = Math.min($prefixItems.length, length);
			for (; i < length2; i++) {
				const result = validate(instance[i], $prefixItems[i], draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, `${keywordLocation}/${i}`);
				evaluated[i] = true;
				if (!result.valid) {
					stop = shortCircuit;
					errors.push({
						instanceLocation,
						keyword: "prefixItems",
						keywordLocation,
						error: `Items did not match schema.`
					}, ...result.errors);
					if (stop) break;
				}
			}
		}
		if ($items !== void 0) {
			const keywordLocation = `${schemaLocation}/items`;
			if (Array.isArray($items)) {
				const length2 = Math.min($items.length, length);
				for (; i < length2; i++) {
					const result = validate(instance[i], $items[i], draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, `${keywordLocation}/${i}`);
					evaluated[i] = true;
					if (!result.valid) {
						stop = shortCircuit;
						errors.push({
							instanceLocation,
							keyword: "items",
							keywordLocation,
							error: `Items did not match schema.`
						}, ...result.errors);
						if (stop) break;
					}
				}
			} else for (; i < length; i++) {
				const result = validate(instance[i], $items, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, keywordLocation);
				evaluated[i] = true;
				if (!result.valid) {
					stop = shortCircuit;
					errors.push({
						instanceLocation,
						keyword: "items",
						keywordLocation,
						error: `Items did not match schema.`
					}, ...result.errors);
					if (stop) break;
				}
			}
			if (!stop && $additionalItems !== void 0) {
				const keywordLocation$1 = `${schemaLocation}/additionalItems`;
				for (; i < length; i++) {
					const result = validate(instance[i], $additionalItems, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, keywordLocation$1);
					evaluated[i] = true;
					if (!result.valid) {
						stop = shortCircuit;
						errors.push({
							instanceLocation,
							keyword: "additionalItems",
							keywordLocation: keywordLocation$1,
							error: `Items did not match additional items schema.`
						}, ...result.errors);
					}
				}
			}
		}
		if ($contains !== void 0) if (length === 0 && $minContains === void 0) errors.push({
			instanceLocation,
			keyword: "contains",
			keywordLocation: `${schemaLocation}/contains`,
			error: `Array is empty. It must contain at least one item matching the schema.`
		});
		else if ($minContains !== void 0 && length < $minContains) errors.push({
			instanceLocation,
			keyword: "minContains",
			keywordLocation: `${schemaLocation}/minContains`,
			error: `Array has less items (${length}) than minContains (${$minContains}).`
		});
		else {
			const keywordLocation = `${schemaLocation}/contains`;
			const errorsLength = errors.length;
			let contained = 0;
			for (let j = 0; j < length; j++) {
				const result = validate(instance[j], $contains, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${j}`, keywordLocation);
				if (result.valid) {
					evaluated[j] = true;
					contained++;
				} else errors.push(...result.errors);
			}
			if (contained >= ($minContains || 0)) errors.length = errorsLength;
			if ($minContains === void 0 && $maxContains === void 0 && contained === 0) errors.splice(errorsLength, 0, {
				instanceLocation,
				keyword: "contains",
				keywordLocation,
				error: `Array does not contain item matching schema.`
			});
			else if ($minContains !== void 0 && contained < $minContains) errors.push({
				instanceLocation,
				keyword: "minContains",
				keywordLocation: `${schemaLocation}/minContains`,
				error: `Array must contain at least ${$minContains} items matching schema. Only ${contained} items were found.`
			});
			else if ($maxContains !== void 0 && contained > $maxContains) errors.push({
				instanceLocation,
				keyword: "maxContains",
				keywordLocation: `${schemaLocation}/maxContains`,
				error: `Array may contain at most ${$maxContains} items matching schema. ${contained} items were found.`
			});
		}
		if (!stop && $unevaluatedItems !== void 0) {
			const keywordLocation = `${schemaLocation}/unevaluatedItems`;
			for (; i < length; i++) {
				if (evaluated[i]) continue;
				const result = validate(instance[i], $unevaluatedItems, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, keywordLocation);
				evaluated[i] = true;
				if (!result.valid) errors.push({
					instanceLocation,
					keyword: "unevaluatedItems",
					keywordLocation,
					error: `Items did not match unevaluated items schema.`
				}, ...result.errors);
			}
		}
		if ($uniqueItems) for (let j = 0; j < length; j++) {
			const a = instance[j];
			const ao = typeof a === "object" && a !== null;
			for (let k = 0; k < length; k++) {
				if (j === k) continue;
				const b = instance[k];
				if (a === b || ao && typeof b === "object" && b !== null && deepCompareStrict(a, b)) {
					errors.push({
						instanceLocation,
						keyword: "uniqueItems",
						keywordLocation: `${schemaLocation}/uniqueItems`,
						error: `Duplicate items at indexes ${j} and ${k}.`
					});
					j = Number.MAX_SAFE_INTEGER;
					k = Number.MAX_SAFE_INTEGER;
				}
			}
		}
	} else if (instanceType === "number") {
		if (draft === "4") {
			if ($minimum !== void 0 && ($exclusiveMinimum === true && instance <= $minimum || instance < $minimum)) errors.push({
				instanceLocation,
				keyword: "minimum",
				keywordLocation: `${schemaLocation}/minimum`,
				error: `${instance} is less than ${$exclusiveMinimum ? "or equal to " : ""} ${$minimum}.`
			});
			if ($maximum !== void 0 && ($exclusiveMaximum === true && instance >= $maximum || instance > $maximum)) errors.push({
				instanceLocation,
				keyword: "maximum",
				keywordLocation: `${schemaLocation}/maximum`,
				error: `${instance} is greater than ${$exclusiveMaximum ? "or equal to " : ""} ${$maximum}.`
			});
		} else {
			if ($minimum !== void 0 && instance < $minimum) errors.push({
				instanceLocation,
				keyword: "minimum",
				keywordLocation: `${schemaLocation}/minimum`,
				error: `${instance} is less than ${$minimum}.`
			});
			if ($maximum !== void 0 && instance > $maximum) errors.push({
				instanceLocation,
				keyword: "maximum",
				keywordLocation: `${schemaLocation}/maximum`,
				error: `${instance} is greater than ${$maximum}.`
			});
			if ($exclusiveMinimum !== void 0 && instance <= $exclusiveMinimum) errors.push({
				instanceLocation,
				keyword: "exclusiveMinimum",
				keywordLocation: `${schemaLocation}/exclusiveMinimum`,
				error: `${instance} is less than ${$exclusiveMinimum}.`
			});
			if ($exclusiveMaximum !== void 0 && instance >= $exclusiveMaximum) errors.push({
				instanceLocation,
				keyword: "exclusiveMaximum",
				keywordLocation: `${schemaLocation}/exclusiveMaximum`,
				error: `${instance} is greater than or equal to ${$exclusiveMaximum}.`
			});
		}
		if ($multipleOf !== void 0) {
			const remainder = instance % $multipleOf;
			if (Math.abs(0 - remainder) >= 1.1920929e-7 && Math.abs($multipleOf - remainder) >= 1.1920929e-7) errors.push({
				instanceLocation,
				keyword: "multipleOf",
				keywordLocation: `${schemaLocation}/multipleOf`,
				error: `${instance} is not a multiple of ${$multipleOf}.`
			});
		}
	} else if (instanceType === "string") {
		const length = $minLength === void 0 && $maxLength === void 0 ? 0 : ucs2length(instance);
		if ($minLength !== void 0 && length < $minLength) errors.push({
			instanceLocation,
			keyword: "minLength",
			keywordLocation: `${schemaLocation}/minLength`,
			error: `String is too short (${length} < ${$minLength}).`
		});
		if ($maxLength !== void 0 && length > $maxLength) errors.push({
			instanceLocation,
			keyword: "maxLength",
			keywordLocation: `${schemaLocation}/maxLength`,
			error: `String is too long (${length} > ${$maxLength}).`
		});
		if ($pattern !== void 0 && !new RegExp($pattern, "u").test(instance)) errors.push({
			instanceLocation,
			keyword: "pattern",
			keywordLocation: `${schemaLocation}/pattern`,
			error: `String does not match pattern.`
		});
		if ($format !== void 0 && format[$format] && !format[$format](instance)) errors.push({
			instanceLocation,
			keyword: "format",
			keywordLocation: `${schemaLocation}/format`,
			error: `String does not match format "${$format}".`
		});
	}
	return {
		valid: errors.length === 0,
		errors
	};
}
var Validator = class {
	schema;
	draft;
	shortCircuit;
	lookup;
	constructor(schema, draft = "2019-09", shortCircuit = true) {
		this.schema = schema;
		this.draft = draft;
		this.shortCircuit = shortCircuit;
		this.lookup = dereference(schema);
	}
	validate(instance) {
		return validate(instance, this.schema, this.draft, this.lookup, this.shortCircuit);
	}
	addSchema(schema, id) {
		if (id) schema = {
			...schema,
			$id: id
		};
		dereference(schema, this.lookup);
	}
};
/**
* Cloudflare Worker-compatible JSON Schema validator provider
*
* This provider uses @cfworker/json-schema for validation without code generation,
* making it compatible with edge runtimes like Cloudflare Workers that restrict
* eval and new Function.
*
* @see {@linkcode AjvJsonSchemaValidator} for the Node.js alternative
*/
/**
* `@cfworker/json-schema`-backed JSON Schema validator. See
* `@modelcontextprotocol/{client,server}/validators/cf-worker` for the customisation entry point.
*
* Default dispatches on the schema's declared dialect: no `$schema` or 2020-12 → `'2020-12'`
* (SEP-1613); 2019-09 → `'2019-09'`; draft-07 or draft-06 → `'7'`. Schemas declaring any other `$schema` are rejected
* with a plain `Error`. Passing an explicit `draft` to the constructor
* overrides this — that draft is used for every schema regardless of `$schema`.
*
* Known draft-07 engine gap: `@cfworker/json-schema` does not treat draft-07 `dependencies` as
* a name→subschema map during `$ref` collection, so a dependency entry whose KEY collides with
* a JSON Schema keyword (`type`, `default`, `format`, `required`, `pattern`, …) and whose
* subschema contains a `$ref` throws `Unresolved $ref` at validation time when the dependency
* triggers — data-dependently, not at compile. The Node (classic Ajv) engine handles the same
* schema correctly. Callers that hit this receive the SDK's typed validation error (the throw
* is captured by the validation paths), and the deviation is pinned by a recorded-contract test.
*
* @example Use with default configuration (2020-12, shortcircuit on)
* ```ts source="./cfWorkerProvider.examples.ts#CfWorkerJsonSchemaValidator_default"
* const validator = new CfWorkerJsonSchemaValidator();
* ```
*
* @example Use with custom configuration
* ```ts source="./cfWorkerProvider.examples.ts#CfWorkerJsonSchemaValidator_customConfig"
* const validator = new CfWorkerJsonSchemaValidator({
*     draft: '2020-12',
*     shortcircuit: false // Report all errors
* });
* ```
*/
var CfWorkerJsonSchemaValidator = class {
	shortcircuit;
	/** Caller-supplied draft; when set, the `$schema` check is skipped (caller owns dialect). */
	draft;
	/**
	* Create a validator
	*
	* @param options - Configuration options
	* @param options.shortcircuit - If `true`, stop validation after first error (default: `true`)
	* @param options.draft - JSON Schema draft version to force for every schema. When set, the
	* `$schema` dispatch is skipped. When omitted, the provider dispatches on each schema's
	* declared `$schema` (2020-12, 2019-09, draft-07, draft-06; absent means 2020-12) and rejects others.
	*/
	constructor(options) {
		this.shortcircuit = options?.shortcircuit ?? true;
		this.draft = options?.draft;
	}
	/**
	* Pick the engine draft for a schema's declared dialect (a caller-forced `{draft}` bypasses
	* this — do not second-guess by `$schema`). No `$schema` or 2020-12 → `'2020-12'`; 2019-09 →
	* `'2019-09'`; draft-07 or draft-06 → `'7'`; anything else → `Error`.
	*/
	_draftFor(schema) {
		const dialect = declaredDialect(schema, "pass an explicit { draft } to CfWorkerJsonSchemaValidator to validate other dialects.");
		return dialect === "draft-7" ? "7" : dialect;
	}
	/**
	* Create a validator for the given JSON Schema
	*
	* Unlike AJV, this validator is not cached internally
	*
	* @param schema - Standard JSON Schema object
	* @returns A validator function that validates input data
	*/
	getValidator(schema) {
		const validator = new Validator(schema, this.draft ?? this._draftFor(schema), this.shortcircuit);
		return (input) => {
			const result = validator.validate(input);
			return result.valid ? {
				valid: true,
				data: input,
				errorMessage: void 0
			} : {
				valid: false,
				data: void 0,
				errorMessage: result.errors.map((err) => `${err.instanceLocation}: ${err.error}`).join("; ")
			};
		};
	}
};
//#endregion
//#region node_modules/@modelcontextprotocol/server/dist/mcp-DIH4cS6P.mjs
const COMPLETABLE_SYMBOL = Symbol.for("mcp.completable");
/**
* Checks if a schema is completable (has completion metadata).
*/
function isCompletable(schema) {
	return !!schema && typeof schema === "object" && COMPLETABLE_SYMBOL in schema;
}
/**
* Gets the completer callback from a completable schema, if it exists.
*/
function getCompleter(schema) {
	return schema[COMPLETABLE_SYMBOL]?.complete;
}
/**
* Whether a `subscriptions/listen` filter accepts a given change event.
*
* Pure: no I/O, no mutation. The filter governs ONLY the four
* subscription-gated change types — non-gated notifications never reach the
* bus and are not modeled here.
*
* `resource_updated` matches only when `resourceSubscriptions` is present and
* contains the event's URI exactly (per the spec: "for these resource URIs").
*/
function listenFilterAccepts(filter, event) {
	switch (event.kind) {
		case "tools_list_changed": return filter.toolsListChanged === true;
		case "prompts_list_changed": return filter.promptsListChanged === true;
		case "resources_list_changed": return filter.resourcesListChanged === true;
		case "resource_updated": return filter.resourceSubscriptions !== void 0 && filter.resourceSubscriptions.includes(event.uri);
	}
}
/**
* The honored subset of a requested filter: keeps only the fields the client
* explicitly opted in to (drops `false` and absent fields), narrowed against
* the server's declared capabilities when supplied. The serving entry sends
* this back in `notifications/subscriptions/acknowledged` so the ack reflects
* what the server can actually deliver.
*
* - `toolsListChanged` is honored only when `capabilities.tools.listChanged`
*   is advertised; likewise `promptsListChanged` / `resourcesListChanged`.
* - `resourceSubscriptions` is honored only when
*   `capabilities.resources.subscribe` is advertised.
*
* `capabilities` is optional on this pure helper for test convenience only —
* both wired routers REQUIRE capabilities at the call site (the HTTP router's
* `serve()` takes a required parameter; `StdioListenRouter.serve()` throws
* before `setServerCapabilities()` was called), so the fail-open
* `undefined → honor everything` branch is never reachable on a wired entry.
*/
function honoredSubset(requested, capabilities) {
	const honored = {};
	const allow = (bit) => capabilities === void 0 || bit === true;
	if (requested.toolsListChanged === true && allow(capabilities?.tools?.listChanged)) honored.toolsListChanged = true;
	if (requested.promptsListChanged === true && allow(capabilities?.prompts?.listChanged)) honored.promptsListChanged = true;
	if (requested.resourcesListChanged === true && allow(capabilities?.resources?.listChanged)) honored.resourcesListChanged = true;
	if (requested.resourceSubscriptions !== void 0 && requested.resourceSubscriptions.length > 0 && allow(capabilities?.resources?.subscribe)) honored.resourceSubscriptions = [...requested.resourceSubscriptions];
	return honored;
}
/** Default capacity guard: refuse a new subscription when this many are already open. */
const DEFAULT_MAX_SUBSCRIPTIONS = 1024;
/** Stamp the subscription id onto a notification's `_meta`. Non-mutating. */
function stampSubscriptionId(notification, subscriptionId) {
	return {
		method: notification.method,
		params: {
			...notification.params,
			_meta: {
				...notification.params?._meta,
				[SUBSCRIPTION_ID_META_KEY]: subscriptionId
			}
		}
	};
}
/**
* Read the requested filter off a `subscriptions/listen` request body.
* Returns the validated filter, or `undefined` when `params.notifications`
* is absent or fails the schema (the caller answers `-32602` — the spec
* marks `notifications` REQUIRED on the listen request).
*/
function parseListenFilter(message) {
	const outcome = codecForVersion(MODERN_WIRE_REVISION).validateRequest("subscriptions/listen", message);
	return outcome.ok ? outcome.value.params?.notifications : void 0;
}
const CHANGE_NOTIFICATION_METHODS = /* @__PURE__ */ new Set([
	"notifications/tools/list_changed",
	"notifications/prompts/list_changed",
	"notifications/resources/list_changed",
	"notifications/resources/updated"
]);
/**
* Per-connection listen state for the stdio entry. One instance is held by
* `serveStdio` for the connection lifetime; it routes inbound
* `subscriptions/listen` / `notifications/cancelled` and rewrites outbound
* change notifications onto the active subscriptions. No bus — the long-lived
* pinned instance's existing `send*ListChanged()` calls feed straight into
* `routeOutbound()`.
*/
var StdioListenRouter = class {
	/** Active subscriptions, keyed by the listen request's JSON-RPC id verbatim. */
	_subs = /* @__PURE__ */ new Map();
	/**
	* The serving instance's declared capabilities. Filled in by the entry
	* once the modern instance is constructed (the router is created before
	* the instance exists), so the acknowledged filter is narrowed against
	* what the server can actually deliver.
	*/
	_serverCapabilities;
	/**
	* The serving instance's identity, stamped onto the graceful-close
	* results' `_meta` (the spec's `SubscriptionsListenResultMetaObject` extends
	* `ResultMetaObject`). Handed over together with the capabilities.
	*/
	_serverInfo;
	constructor(_maxSubscriptions = DEFAULT_MAX_SUBSCRIPTIONS, serverCapabilities, serverInfo) {
		this._maxSubscriptions = _maxSubscriptions;
		this._serverCapabilities = serverCapabilities;
		this._serverInfo = serverInfo;
	}
	/**
	* Record the serving instance's declared capabilities and identity once
	* it has been constructed. Called by `serveStdio`'s connect path;
	* subsequent `serve()` calls narrow the honored filter against the
	* capabilities, and `teardownAll()` stamps the identity.
	*/
	setServerCapabilities(capabilities, serverInfo) {
		this._serverCapabilities = capabilities;
		if (serverInfo !== void 0) this._serverInfo = serverInfo;
	}
	/** Whether `id` is an active listen subscription on this connection. */
	has(id) {
		return this._subs.has(id);
	}
	/**
	* Serve one inbound `subscriptions/listen` request: registers the
	* subscription and returns the stamped acknowledged notification (or, on
	* capacity / params rejection, the in-band JSON-RPC error response).
	*
	* @throws when called before {@linkcode setServerCapabilities} (or the
	* constructor) has supplied the serving instance's capabilities. Honoring a
	* filter without knowing the server's advertised capabilities would fail
	* open (deliver unadvertised types); the entry guarantees capabilities are
	* set before any listen request is routed here.
	*/
	serve(message) {
		if (this._serverCapabilities === void 0) throw new Error("StdioListenRouter.serve() called before setServerCapabilities(); refusing to honor a filter without capabilities");
		if (this._subs.size >= this._maxSubscriptions) return {
			jsonrpc: "2.0",
			id: message.id,
			error: {
				code: -32603,
				message: "Subscription limit reached"
			}
		};
		const filter = parseListenFilter(message);
		if (filter === void 0) return {
			jsonrpc: "2.0",
			id: message.id,
			error: {
				code: -32602,
				message: "Invalid params: 'notifications' is required and must be a valid SubscriptionFilter"
			}
		};
		const honored = honoredSubset(filter, this._serverCapabilities);
		this._subs.set(message.id, honored);
		return stampSubscriptionId({
			method: "notifications/subscriptions/acknowledged",
			params: { notifications: honored }
		}, message.id);
	}
	/**
	* Tear down one subscription (inbound `notifications/cancelled`). Returns
	* `true` when a subscription was removed. After this call NOTHING further
	* is delivered for that subscription id (the post-cancel hardening).
	*/
	cancel(id) {
		return this._subs.delete(id);
	}
	/**
	* Route an outbound notification through the active subscriptions.
	*
	* - For a subscription-gated change notification, returns one stamped copy
	*   per subscription that opted in to it (an empty array means it is
	*   dropped — the modern era never delivers an un-requested change type).
	* - For any other outbound message, returns `'passthrough'` (the entry
	*   forwards it as-is).
	*/
	routeOutbound(message) {
		if (!CHANGE_NOTIFICATION_METHODS.has(message.method)) return "passthrough";
		const uriParam = message.params?.["uri"];
		const uri = typeof uriParam === "string" ? uriParam : void 0;
		const event = notificationToServerEvent(message.method, uri);
		const out = [];
		for (const [subscriptionId, filter] of this._subs) if (listenFilterAccepts(filter, event)) out.push(stampSubscriptionId({
			method: message.method,
			params: message.params ?? {}
		}, subscriptionId));
		return out;
	}
	/**
	* Server-side graceful teardown of every active subscription: returns the
	* empty `subscriptions/listen` JSON-RPC result for each subscription id —
	* the spec's graceful-close signal, `_meta` carrying the subscription id
	* and the serving instance's identity — for the entry to emit before
	* closing the wire. Clears the set so nothing further is delivered.
	*/
	teardownAll() {
		const out = [];
		for (const id of this._subs.keys()) out.push({
			jsonrpc: "2.0",
			id,
			result: {
				resultType: "complete",
				_meta: {
					[SUBSCRIPTION_ID_META_KEY]: id,
					...this._serverInfo !== void 0 && { ["io.modelcontextprotocol/serverInfo"]: this._serverInfo }
				}
			}
		});
		this._subs.clear();
		return out;
	}
};
function notificationToServerEvent(method, uri) {
	switch (method) {
		case "notifications/tools/list_changed": return { kind: "tools_list_changed" };
		case "notifications/prompts/list_changed": return { kind: "prompts_list_changed" };
		case "notifications/resources/list_changed": return { kind: "resources_list_changed" };
		default: return {
			kind: "resource_updated",
			uri: uri ?? ""
		};
	}
}
/** @internal */
function supportsScopeChallengeResolver(transport) {
	return typeof transport === "object" && transport !== null && "setScopeChallengeResolver" in transport && typeof transport.setScopeChallengeResolver === "function";
}
/**
* Default handler re-entries per originating request — tighter than the
* client driver's 10 because the shim holds a live wire request open.
*/
const DEFAULT_LEGACY_SHIM_MAX_ROUNDS = 8;
/** Default per-leg timeout: legs are human-paced, so the 60s protocol default is wrong. */
const DEFAULT_LEGACY_SHIM_ROUND_TIMEOUT_MS = 6e5;
/** Resolves and validates `ServerOptions.inputRequired`, failing loudly at construction time. */
function resolveLegacyShimOptions(options) {
	if (options?.maxRounds !== void 0 && (!Number.isInteger(options.maxRounds) || options.maxRounds < 1)) throw new RangeError(`inputRequired.maxRounds must be a positive integer (got ${options.maxRounds})`);
	if (options?.roundTimeoutMs !== void 0 && (!Number.isFinite(options.roundTimeoutMs) || options.roundTimeoutMs <= 0)) throw new RangeError(`inputRequired.roundTimeoutMs must be a positive number (got ${options.roundTimeoutMs})`);
	return {
		maxRounds: options?.maxRounds ?? DEFAULT_LEGACY_SHIM_MAX_ROUNDS,
		roundTimeoutMs: options?.roundTimeoutMs ?? DEFAULT_LEGACY_SHIM_ROUND_TIMEOUT_MS,
		legacyShim: options?.legacyShim ?? true
	};
}
/**
* Validates one `inputRequests` entry: malformed or unknown kinds are server
* bugs and fail loudly on both eras. Shared by the modern seam's capability
* check and the shim's gate.
*/
function coerceEmbeddedInputRequest(method, key, entry) {
	if (entry === null || typeof entry !== "object" || typeof entry.method !== "string") throw new ProtocolError(ProtocolErrorCode.InternalError, `Handler for ${method} returned an invalid input request '${key}': each inputRequests entry must be an embedded elicitation/create, sampling/createMessage, or roots/list request`);
	const embedded = entry;
	const required = requiredClientCapabilitiesForInputRequest(embedded);
	if (required === void 0) throw new ProtocolError(ProtocolErrorCode.InternalError, `Handler for ${method} returned an input request '${key}' of kind '${embedded.method}', which is not an embedded request the 2026-07-28 revision defines`);
	return {
		embedded,
		required
	};
}
/**
* The 2025-11-25 URL-mode wire shape requires an `elicitationId`; the 2026
* in-band shape has none, so URL legs mint one (CSPRNG-backed, with a
* getRandomValues fallback for runtimes without `randomUUID`).
*/
function syntheticElicitationId() {
	const webCrypto = globalThis.crypto;
	if (webCrypto?.randomUUID !== void 0) return webCrypto.randomUUID();
	const bytes = /* @__PURE__ */ new Uint8Array(16);
	webCrypto.getRandomValues(bytes);
	bytes[6] = bytes[6] & 15 | 64;
	bytes[8] = bytes[8] & 63 | 128;
	const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
/** Per-family surfacing: tools/call → isError result (the 2025 idiom); prompts/resources → JSON-RPC error. */
function legacyShimFailure(method, message) {
	if (method === "tools/call") return {
		content: [{
			type: "text",
			text: message
		}],
		isError: true
	};
	throw new ProtocolError(ProtocolErrorCode.InternalError, message);
}
/** The fulfilment loop — see the module doc for the contract. */
var LegacyInputRequiredShim = class {
	constructor(_host) {
		this._host = _host;
	}
	async fulfill(method, handler, request, ctx, firstResult) {
		const { maxRounds, roundTimeoutMs } = this._host;
		const outerSignal = ctx.mcpReq.signal;
		let current = firstResult;
		let round = 0;
		while (true) {
			round += 1;
			if (round > maxRounds) return legacyShimFailure(method, inputRequiredRoundsExceededMessage(method, maxRounds));
			const inputRequests = current.inputRequests;
			const hasInputRequests = inputRequests != null && Object.keys(inputRequests).length > 0;
			const requestState = typeof current.requestState === "string" ? current.requestState : void 0;
			if (!hasInputRequests && requestState === void 0) throw new ProtocolError(ProtocolErrorCode.InternalError, `Handler for ${method} returned an input-required result with neither inputRequests nor requestState (every InputRequiredResult must include at least one of the two)`);
			let responses;
			if (hasInputRequests) {
				const declared = this._host.resolvedClientCapabilities(ctx);
				const coerced = [];
				for (const [key, entry] of Object.entries(inputRequests)) {
					const { embedded, required } = coerceEmbeddedInputRequest(method, key, entry);
					if (embedded.method !== "roots/list" && embedded.params === void 0) throw new ProtocolError(ProtocolErrorCode.InternalError, `Handler for ${method} returned an input request '${key}' of kind '${embedded.method}' without params`);
					if (missingClientCapabilities(required, declared) !== void 0) return legacyShimFailure(method, `Cannot request input '${key}' (${embedded.method}): the client on this 2025-era connection did not declare the required capability${declared === void 0 ? " (no client capabilities are available on this connection — per-request legacy serving cannot receive server-to-client requests)" : ""}`);
					coerced.push([key, embedded]);
				}
				const roundAbort = linkedRoundAbort(outerSignal);
				try {
					const legOptions = {
						relatedRequestId: ctx.mcpReq.id,
						timeout: roundTimeoutMs,
						resetTimeoutOnProgress: true,
						onprogress: () => {},
						signal: roundAbort.signal
					};
					const fulfilled = await Promise.all(coerced.map(async ([key, embedded]) => {
						try {
							return [key, await this._dispatchLeg(embedded, legOptions)];
						} catch (error) {
							roundAbort.abort(error);
							throw error;
						}
					}));
					responses = Object.fromEntries(fulfilled);
				} catch (error) {
					if (outerSignal.aborted) throw error;
					return legacyShimFailure(method, `Fulfilling input required by '${method}' failed: ${error instanceof Error ? error.message : String(error)}`);
				} finally {
					roundAbort.dispose();
				}
			} else await sleep(250, outerSignal);
			let ctxNext = {
				...ctx,
				mcpReq: {
					...ctx.mcpReq,
					inputResponses: responses,
					droppedInputResponseKeys: void 0,
					requestState: requestStateAccessor(requestState)
				}
			};
			if (requestState !== void 0) {
				const decoded = await this._host.verifyRequestState(requestState, ctxNext, method);
				if (decoded !== void 0) ctxNext = withRequestStateValue(ctxNext, decoded);
			}
			const next = await handler(request, ctxNext);
			if (!isInputRequiredResult(next)) return next;
			current = next;
		}
	}
	/** Routes one embedded request through the host's existing 2025-era senders (gate already ran). */
	async _dispatchLeg(embedded, options) {
		switch (embedded.method) {
			case "elicitation/create": {
				let params = embedded.params;
				if (params.mode === "url" && params.elicitationId === void 0) params = {
					...params,
					elicitationId: syntheticElicitationId()
				};
				return await this._host.sendElicitation(params, options);
			}
			case "sampling/createMessage": return await this._host.sendSampling(embedded.params, options);
			case "roots/list": return await this._host.listRoots(embedded.params, options);
		}
	}
};
/**
* The request methods whose 2026-07-28 result vocabulary includes
* `input_required` (the multi round-trip methods). Returning an
* input-required result from any other handler is a server bug.
*/
const INPUT_REQUIRED_CAPABLE_METHODS = /* @__PURE__ */ new Set([
	"tools/call",
	"prompts/get",
	"resources/read"
]);
let installDiscoverHandler;
let readServerIdentity;
/**
* Package-internal: installs the modern-only `server/discover` handler on an instance
* the HTTP entry has marked as serving the 2026-07-28 era, and makes sure the modern
* revisions the entry serves appear in the instance's supported-versions list (so the
* discover advertisement and version-mismatch errors name them). Idempotent.
* Hand-constructed instances are unaffected: nothing else calls this, so they keep
* answering `-32601` unless their own supported-versions list opts into a modern
* revision. Not public API.
*/
function installModernOnlyHandlers(server, servedModernVersions) {
	installDiscoverHandler(server, servedModernVersions);
}
/**
* Package-internal: the instance's implementation identity, for the serving
* entries to stamp onto entry-built results (the `subscriptions/listen`
* graceful-close result — built outside the encode seam, but the spec's
* `SubscriptionsListenResultMetaObject` extends `ResultMetaObject`, so it carries
* the serverInfo SHOULD like every other result). Not public API.
*/
function serverIdentityOf(server) {
	return readServerIdentity(server);
}
/**
* An MCP server on top of a pluggable transport.
*
* This server will automatically respond to the initialization flow as initiated from the client.
*
* @deprecated Use {@linkcode server/mcp.McpServer | McpServer} instead for the high-level API. Only use `Server` for advanced use cases.
*/
var Server = class extends Protocol {
	_clientCapabilities;
	_clientVersion;
	static {
		installDiscoverHandler = (server, servedModernVersions) => {
			const missing = servedModernVersions.filter((version) => !server._supportedProtocolVersions.includes(version));
			if (missing.length > 0) server._supportedProtocolVersions = [...server._supportedProtocolVersions, ...missing];
			server.setRequestHandler("server/discover", () => server._ondiscover());
		};
		readServerIdentity = (server) => server._serverInfo;
	}
	_capabilities;
	_instructions;
	_jsonSchemaValidator;
	_cacheHints;
	_requestStateVerify;
	_inputRequiredServing;
	_legacyShim;
	/** Lazily-built legacy shim; the loop lives in legacyInputRequiredShim.ts behind a narrow host contract. */
	_legacyInputRequiredShim() {
		return this._legacyShim ??= new LegacyInputRequiredShim({
			maxRounds: this._inputRequiredServing.maxRounds,
			roundTimeoutMs: this._inputRequiredServing.roundTimeoutMs,
			resolvedClientCapabilities: (ctx) => this._inputRequestCapabilityView(ctx),
			verifyRequestState: (state, ctx, method) => this._verifyRequestState(state, ctx, method),
			sendElicitation: (params, options) => this._sendElicitationLeg(params, options, { validateAcceptedContent: false }),
			sendSampling: (params, options) => this.createMessage(params, options),
			listRoots: (params, options) => this.listRoots(params, options)
		});
	}
	/**
	* Callback for when initialization has fully completed (i.e., the client has sent an `notifications/initialized` notification).
	*/
	oninitialized;
	/**
	* Initializes this server with the given name and version information.
	*/
	constructor(_serverInfo, options) {
		super(options);
		this._serverInfo = _serverInfo;
		this._capabilities = options?.capabilities ? { ...options.capabilities } : {};
		this._instructions = options?.instructions;
		this._jsonSchemaValidator = options?.jsonSchemaValidator ?? new CfWorkerJsonSchemaValidator();
		this._requestStateVerify = options?.requestState?.verify;
		this._inputRequiredServing = resolveLegacyShimOptions(options?.inputRequired);
		if (options?.cacheHints !== void 0) {
			for (const [operation, hint] of Object.entries(options.cacheHints)) if (hint !== void 0) assertValidCacheHint(hint, `cacheHints['${operation}']`);
			this._cacheHints = options.cacheHints;
		}
		this.setRequestHandler("initialize", (request) => this._oninitialize(request));
		this.setNotificationHandler("notifications/initialized", () => this.oninitialized?.());
		if (modernProtocolVersions(this._supportedProtocolVersions).length > 0) this.setRequestHandler("server/discover", () => this._ondiscover());
		if (this._capabilities.logging) this._registerLoggingHandler();
	}
	/** Attaches to the given transport; rejects while this instance is connected to another one. */
	async connect(transport) {
		if (this.transport !== void 0) throw new SdkError(SdkErrorCode.AlreadyConnected, "Use a separate Server instance per connection: this instance is already connected to a transport. To connect it to a new transport, call close() first.");
		await super.connect(transport);
	}
	/**
	* Registers the built-in `logging/setLevel` request handler.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577).
	* Remains functional during the deprecation window (at least twelve months).
	* Migrate to stderr logging (STDIO servers) or OpenTelemetry.
	*/
	_registerLoggingHandler() {
		this.setRequestHandler("logging/setLevel", async (request, ctx) => {
			const transportSessionId = ctx.sessionId || ctx.http?.req?.headers.get("mcp-session-id") || void 0;
			const { level } = request.params;
			const parseResult = parseSchema(LoggingLevelSchema, level);
			if (parseResult.success) this._loggingLevels.set(transportSessionId, parseResult.data);
			return {};
		});
	}
	buildContext(ctx, transportInfo) {
		const hasHttpInfo = ctx.http || transportInfo?.request || transportInfo?.closeSSEStream || transportInfo?.closeStandaloneSSEStream;
		return {
			...ctx,
			mcpReq: {
				...ctx.mcpReq,
				log: (level, data, logger) => {
					if (!this._capabilities.logging) return Promise.resolve();
					let threshold;
					if (this._servedModernEra()) {
						threshold = ctx.mcpReq.envelope?.[LOG_LEVEL_META_KEY];
						if (threshold === void 0) return Promise.resolve();
					} else threshold = this._loggingLevels.get(ctx.sessionId) ?? this._loggingLevels.get(void 0);
					if (threshold !== void 0 && this.LOG_LEVEL_SEVERITY.get(level) < this.LOG_LEVEL_SEVERITY.get(threshold)) return Promise.resolve();
					return ctx.mcpReq.notify({
						method: "notifications/message",
						params: {
							level,
							data,
							logger
						}
					});
				},
				elicitInput: (params, options) => this.elicitInput(params, options),
				requestSampling: (params, options) => this.createMessage(params, options)
			},
			http: hasHttpInfo ? {
				...ctx.http,
				req: transportInfo?.request,
				closeSSE: transportInfo?.closeSSEStream,
				closeStandaloneSSE: transportInfo?.closeStandaloneSSEStream
			} : void 0
		};
	}
	_loggingLevels = /* @__PURE__ */ new Map();
	LOG_LEVEL_SEVERITY = new Map(LoggingLevelSchema.options.map((level, index) => [level, index]));
	isMessageIgnored = (level, sessionId) => {
		const currentLevel = this._loggingLevels.get(sessionId);
		return currentLevel ? this.LOG_LEVEL_SEVERITY.get(level) < this.LOG_LEVEL_SEVERITY.get(currentLevel) : false;
	};
	/**
	* Registers new capabilities. This can only be called before connecting to a transport.
	*
	* The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
	*/
	registerCapabilities(capabilities) {
		if (this.transport) throw new SdkError(SdkErrorCode.AlreadyConnected, "Cannot register capabilities after connecting to transport");
		const hadLogging = !!this._capabilities.logging;
		this._capabilities = mergeCapabilities(this._capabilities, capabilities);
		if (!hadLogging && this._capabilities.logging) this._registerLoggingHandler();
	}
	/**
	* Enforces server-side validation for `tools/call` results regardless of how the
	* handler was registered, attaches the configured per-operation cache hint
	* (when one exists) so the 2026-07-28 encode seam can fill `ttlMs`/`cacheScope`
	* for results that do not provide their own, and owns the multi-round-trip
	* seam: on the methods whose 2026-07-28 result vocabulary includes
	* `input_required` (`tools/call`, `prompts/get`, `resources/read`) an
	* input-required return skips result-schema validation and is checked
	* against the served era, the at-least-one rule, and the request's own
	* declared client capabilities; on every other method an input-required
	* return is a server bug and fails loudly. The hint rides a symbol-keyed
	* property that is never serialized, so 2025-era responses are unaffected.
	*/
	_wrapHandler(method, handler) {
		if (method !== "tools/call") {
			const cacheHint = this._cacheHints?.[method];
			const isInputRequiredCapable = INPUT_REQUIRED_CAPABLE_METHODS.has(method);
			if (cacheHint === void 0 && !isInputRequiredCapable) return async (request, ctx) => {
				const result = await handler(request, ctx);
				if (isInputRequiredResult(result)) throw new ProtocolError(ProtocolErrorCode.InternalError, `Handler for ${method} returned an input-required result, but only tools/call, prompts/get and resources/read support input_required (protocol revision 2026-07-28)`);
				return result;
			};
			return async (request, ctx) => {
				const result = isInputRequiredCapable ? await this._invokeInputRequiredCapableHandler(method, handler, request, ctx) : await handler(request, ctx);
				if (isInputRequiredResult(result)) {
					if (!isInputRequiredCapable) throw new ProtocolError(ProtocolErrorCode.InternalError, `Handler for ${method} returned an input-required result, but only tools/call, prompts/get and resources/read support input_required (protocol revision 2026-07-28)`);
					return result;
				}
				return cacheHint === void 0 ? result : attachCacheHintFallback(result, cacheHint);
			};
		}
		return async (request, ctx) => {
			const codec = codecForVersion(this._negotiatedProtocolVersion);
			const validatedRequest = codec.validateRequest("tools/call", request);
			if (!validatedRequest.ok) throw new ProtocolError(validatedRequest.reason === "not-in-era" ? ProtocolErrorCode.InternalError : ProtocolErrorCode.InvalidParams, validatedRequest.reason === "not-in-era" ? "No wire schema for tools/call in the resolved era" : `Invalid tools/call request: ${validatedRequest.message}`);
			const result = await this._invokeInputRequiredCapableHandler("tools/call", handler, request, ctx);
			if (isInputRequiredResult(result)) return result;
			const normalizedResult = normalizeContentlessToolResult(result);
			const validationResult = codec.validateResult("tools/call", normalizedResult);
			if (!validationResult.ok) throw new ProtocolError(validationResult.reason === "not-in-era" ? ProtocolErrorCode.InternalError : ProtocolErrorCode.InvalidParams, validationResult.reason === "not-in-era" ? "No wire schema for tools/call in the resolved era" : `Invalid tools/call result: ${validationResult.message}`);
			return validationResult.value;
		};
	}
	/**
	* Whether this instance is bound to a 2026-07-28-or-later protocol
	* revision. Era is instance state — a serving entry (`createMcpHandler`,
	* `serveStdio`) marks the instance modern at construction; a 2025-era
	* `initialize` handshake binds it legacy. The multi-round-trip seam reads
	* this directly: there is no per-request era consult.
	*/
	_servedModernEra() {
		return this._negotiatedProtocolVersion !== void 0 && isModernProtocolVersion(this._negotiatedProtocolVersion);
	}
	/**
	* Invokes a handler for one of the multi-round-trip methods and applies
	* the input-required seam:
	*
	* - a `UrlElicitationRequiredError` (or any 2025-style server→client
	*   request idiom) escaping the handler on a request served on the
	*   2026-07-28 era fails LOUDLY with a clear steer to
	*   `inputRequired.elicitUrl(...)` — the `-32042` error never reaches the
	*   2026-07-28 wire and the throw is not silently converted. Requests
	*   served on the 2025 era keep today's `-32042` behavior byte-exact (the
	*   error is rethrown unchanged).
	* - an input-required RETURN toward a 2026-07-28 request must satisfy
	*   the at-least-one rule, and every embedded request must be covered by
	*   the capabilities declared on the request's envelope (violations
	*   answer the typed `-32021` error). Toward a 2025-era request the
	*   return is fulfilled by the default-on legacy shim, whose own gate
	*   consults the initialize-declared capabilities and surfaces
	*   violations per family; `inputRequired.legacyShim: false` restores
	*   the pre-shim loud failure.
	*/
	async _invokeInputRequiredCapableHandler(method, handler, request, ctx) {
		const servedModern = this._servedModernEra();
		const rawRequestState = ctx.mcpReq.requestState();
		if (rawRequestState !== void 0 && typeof rawRequestState !== "string") throw new ProtocolError(ProtocolErrorCode.InvalidParams, "Invalid or expired requestState", { reason: "invalid_request_state" });
		let ctxForHandler = ctx;
		if (typeof rawRequestState === "string") {
			const decoded = await this._verifyRequestState(rawRequestState, ctx, method);
			if (decoded !== void 0) ctxForHandler = withRequestStateValue(ctx, decoded);
		}
		let result;
		try {
			result = await handler(request, ctxForHandler);
		} catch (error) {
			if (error instanceof ProtocolError && error.code === ProtocolErrorCode.UrlElicitationRequired) {
				if (!servedModern) throw error;
				throw new ProtocolError(ProtocolErrorCode.InternalError, `URL elicitation cannot be signalled by throwing UrlElicitationRequiredError on protocol revision ${this._negotiatedProtocolVersion}: return inputRequired({ inputRequests: { …: inputRequired.elicitUrl(...) } }) from the handler instead. The urlElicitationRequired error (-32042) of earlier revisions is not available on this revision.`);
			}
			throw error;
		}
		if (!isInputRequiredResult(result)) return result;
		if (!servedModern) {
			if (!this._inputRequiredServing.legacyShim) throw new ProtocolError(ProtocolErrorCode.InternalError, `Handler for ${method} returned an input-required result, but this request is served on protocol revision ${this._negotiatedProtocolVersion ?? "2025-11-25"}, which has no input_required vocabulary`);
			return await this._legacyInputRequiredShim().fulfill(method, handler, request, ctxForHandler, result);
		}
		const inputRequests = result.inputRequests;
		const hasInputRequests = inputRequests != null && Object.keys(inputRequests).length > 0;
		const hasRequestState = typeof result.requestState === "string";
		if (!hasInputRequests && !hasRequestState) throw new ProtocolError(ProtocolErrorCode.InternalError, `Handler for ${method} returned an input-required result with neither inputRequests nor requestState (every InputRequiredResult must include at least one of the two)`);
		if (hasInputRequests) {
			const declared = this._inputRequestCapabilityView(ctx);
			for (const [key, entry] of Object.entries(inputRequests)) {
				const { embedded, required } = coerceEmbeddedInputRequest(method, key, entry);
				const missing = missingClientCapabilities(required, declared);
				if (missing !== void 0) throw new MissingRequiredClientCapabilityError({ requiredCapabilities: missing }, `Cannot request input '${key}' (${embedded.method}): the request's client capabilities do not declare the required capability`);
			}
		}
		return result;
	}
	/**
	* Runs the configured `requestState.verify` hook and returns its
	* resolved value (`undefined` when unconfigured or the hook returns
	* nothing). Deny-on-error: any hook failure answers the frozen `-32602`;
	* the reason goes to `onerror` only.
	*/
	async _verifyRequestState(state, ctx, method) {
		if (this._requestStateVerify === void 0) return;
		try {
			return await this._requestStateVerify(state, ctx);
		} catch (error) {
			this.onerror?.(/* @__PURE__ */ new Error(`requestState verification rejected ${method}: ${error instanceof Error ? error.message : String(error)}`));
			throw new ProtocolError(ProtocolErrorCode.InvalidParams, "Invalid or expired requestState", { reason: "invalid_request_state" });
		}
	}
	/**
	* The per-request resolved client-capabilities view: the request's own
	* `_meta` envelope on the 2026 era; the `initialize`-declared state on a
	* 2025-era connection. Per-request instances that never saw an
	* initialize (stateless legacy) hold nothing, so gates refuse there.
	*/
	_inputRequestCapabilityView(ctx) {
		return this._servedModernEra() ? ctx.mcpReq.envelope?.[CLIENT_CAPABILITIES_META_KEY] : this._clientCapabilities;
	}
	/**
	* Guard for the push-style server→client request APIs ({@linkcode createMessage},
	* {@linkcode elicitInput}, {@linkcode listRoots}, {@linkcode ping}) on a
	* modern-era instance: the 2026-07-28 revision has no server→client request
	* channel, so the call fails before any wire traffic with a typed error
	* whose message steers to `inputRequired(...)`. The base era gate would
	* also reject it; this guard runs first to carry the steer.
	*/
	_assertPushApiInServedEra(method) {
		if (this._servedModernEra()) throw new SdkError(SdkErrorCode.MethodNotSupportedByProtocolVersion, `Server-to-client requests are not available on protocol revision ${this._negotiatedProtocolVersion}: '${method}' cannot be sent while serving a request on that revision. Return inputRequired({ ... }) from the handler instead — the client fulfils the embedded requests and retries the original request (multi round-trip requests).`, {
			method,
			era: "2026-07-28"
		});
	}
	assertCapabilityForMethod(method) {
		switch (method) {
			case "sampling/createMessage":
				if (!this._clientCapabilities?.sampling) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Client does not support sampling (required for ${method})`);
				break;
			case "elicitation/create":
				if (!this._clientCapabilities?.elicitation) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Client does not support elicitation (required for ${method})`);
				break;
			case "roots/list": if (!this._clientCapabilities?.roots) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Client does not support listing roots (required for ${method})`);
		}
	}
	assertNotificationCapability(method) {
		switch (method) {
			case "notifications/message":
				if (!this._capabilities.logging) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support logging (required for ${method})`);
				break;
			case "notifications/resources/updated":
			case "notifications/resources/list_changed":
				if (!this._capabilities.resources) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support notifying about resources (required for ${method})`);
				break;
			case "notifications/tools/list_changed":
				if (!this._capabilities.tools) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support notifying of tool list changes (required for ${method})`);
				break;
			case "notifications/prompts/list_changed":
				if (!this._capabilities.prompts) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support notifying of prompt list changes (required for ${method})`);
				break;
			case "notifications/elicitation/complete": if (!this._clientCapabilities?.elicitation?.url) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Client does not support URL elicitation (required for ${method})`);
		}
	}
	assertRequestHandlerCapability(method) {
		switch (method) {
			case "completion/complete":
				if (!this._capabilities.completions) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support completions (required for ${method})`);
				break;
			case "logging/setLevel":
				if (!this._capabilities.logging) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support logging (required for ${method})`);
				break;
			case "prompts/get":
			case "prompts/list":
				if (!this._capabilities.prompts) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support prompts (required for ${method})`);
				break;
			case "resources/list":
			case "resources/templates/list":
			case "resources/read":
				if (!this._capabilities.resources) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support resources (required for ${method})`);
				break;
			case "tools/call":
			case "tools/list": if (!this._capabilities.tools) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support tools (required for ${method})`);
		}
	}
	async _oninitialize(request) {
		const requestedVersion = request.params.protocolVersion;
		this._clientCapabilities = request.params.capabilities;
		this._clientVersion = request.params.clientInfo;
		const legacyVersions = legacyProtocolVersions(this._supportedProtocolVersions);
		const protocolVersion = legacyVersions.includes(requestedVersion) ? requestedVersion : legacyVersions[0] ?? "2025-11-25";
		this._negotiatedProtocolVersion = protocolVersion;
		this.transport?.setProtocolVersion?.(protocolVersion);
		return {
			protocolVersion,
			capabilities: this.getCapabilities(),
			serverInfo: this._serverInfo,
			...this._instructions && { instructions: this._instructions }
		};
	}
	/**
	* Answers `server/discover` (protocol revision 2026-07-28). `supportedVersions`
	* lists only modern revisions (2025-era versions are negotiated via `initialize`);
	* the capabilities are advertised as-is, listChanged/subscribe bits included
	* (see {@linkcode discoverAdvertisedCapabilities}).
	*/
	_ondiscover() {
		return {
			supportedVersions: modernProtocolVersions(this._supportedProtocolVersions),
			capabilities: discoverAdvertisedCapabilities(this.getCapabilities()),
			...this._instructions && { instructions: this._instructions }
		};
	}
	/**
	* The identity the 2026-era encode seam stamps into every outbound
	* result's `_meta` under `io.modelcontextprotocol/serverInfo` (spec PR
	* #3002: servers SHOULD identify themselves on every response).
	*/
	_outboundServerInfo() {
		return this._serverInfo;
	}
	/**
	* After initialization has completed, this will be populated with the client's reported capabilities.
	*
	* @deprecated Read client identity from the per-request handler context instead: on
	* 2026-07-28 (per-request envelope) requests `ctx.mcpReq.envelope` carries the client's
	* declared capabilities, while on 2025-era connections this accessor keeps returning the
	* `initialize`-scoped value. The accessor remains functional — instances serving the
	* 2026-07-28 era are backfilled per request from the validated envelope.
	*/
	getClientCapabilities() {
		return this._clientCapabilities;
	}
	/**
	* After initialization has completed, this will be populated with information about the client's name and version.
	*
	* @deprecated Read client identity from the per-request handler context instead: on
	* 2026-07-28 (per-request envelope) requests `ctx.mcpReq.envelope` carries the client's
	* name and version, while on 2025-era connections this accessor keeps returning the
	* `initialize`-scoped value. The accessor remains functional — instances serving the
	* 2026-07-28 era are backfilled per request from the validated envelope.
	*/
	getClientVersion() {
		return this._clientVersion;
	}
	/**
	* After initialization has completed, this will be populated with the protocol version negotiated
	* with the client (the version the server responded with during the initialize handshake), or
	* `undefined` before initialization.
	*
	* @deprecated Read the protocol revision from the per-request handler context instead: on
	* 2026-07-28 (per-request envelope) requests `ctx.mcpReq.envelope` names the revision the
	* request was sent for, while on 2025-era connections this accessor keeps returning the
	* `initialize`-negotiated version. The accessor remains functional — instances serving the
	* 2026-07-28 era report that revision.
	*/
	getNegotiatedProtocolVersion() {
		return this._negotiatedProtocolVersion;
	}
	/**
	* Project a `tools/call` result through this instance's negotiated wire
	* codec — the era-agnostic SEP-2106 §4.3 TextContent auto-append, plus on
	* the 2025 era the `{result:…}` wrap when `structuredContent` is a
	* non-object value or the advertised `outputSchema` had a non-object root.
	* Identity for object-shaped `structuredContent` on the 2026 era.
	*
	* `McpServer`'s built-in `tools/call` handler routes through this method.
	* Low-level `setRequestHandler('tools/call', …)` authors call it
	* themselves so the projection lives in one place (the codec) and the
	* server-side handler stays era-blind.
	*
	* This is the only codec function exposed on `Server` — the full
	* `WireCodec` is intentionally not part of the public surface.
	*/
	projectCallToolResult(result, advertisedOutputSchema) {
		return this._wireCodec().projectCallToolResult(result, advertisedOutputSchema);
	}
	/**
	* Returns the current server capabilities.
	*/
	getCapabilities() {
		return this._capabilities;
	}
	/**
	* Sends a `ping` request to the connected client.
	*
	* @deprecated The 2026-07-28 protocol removed ping; it throws on a 2026-07-28-era instance.
	* If your factory serves both eras, this only works on the legacy path.
	*/
	async ping() {
		this._assertPushApiInServedEra("ping");
		return this.request({ method: "ping" });
	}
	async createMessage(params, options) {
		this._assertPushApiInServedEra("sampling/createMessage");
		if ((params.tools || params.toolChoice) && !this._clientCapabilities?.sampling?.tools) throw new SdkError(SdkErrorCode.CapabilityNotSupported, "Client does not support sampling tools capability.");
		if (params.messages.length > 0) {
			const lastMessage = params.messages.at(-1);
			const lastContent = Array.isArray(lastMessage.content) ? lastMessage.content : [lastMessage.content];
			const hasToolResults = lastContent.some((c) => c.type === "tool_result");
			const previousMessage = params.messages.length > 1 ? params.messages.at(-2) : void 0;
			const previousContent = previousMessage ? Array.isArray(previousMessage.content) ? previousMessage.content : [previousMessage.content] : [];
			const hasPreviousToolUse = previousContent.some((c) => c.type === "tool_use");
			if (hasToolResults) {
				if (lastContent.some((c) => c.type !== "tool_result")) throw new ProtocolError(ProtocolErrorCode.InvalidParams, "The last message must contain only tool_result content if any is present");
				if (!hasPreviousToolUse) throw new ProtocolError(ProtocolErrorCode.InvalidParams, "tool_result blocks are not matching any tool_use from the previous message");
			}
			if (hasPreviousToolUse) {
				const toolUseIds = new Set(previousContent.filter((c) => c.type === "tool_use").map((c) => c.id));
				const toolResultIds = new Set(lastContent.filter((c) => c.type === "tool_result").map((c) => c.toolUseId));
				if (toolUseIds.size !== toolResultIds.size || ![...toolUseIds].every((id) => toolResultIds.has(id))) throw new ProtocolError(ProtocolErrorCode.InvalidParams, "ids of tool_result blocks and tool_use blocks from previous message do not match");
			}
		}
		const hasTools = Boolean(params.tools || params.toolChoice);
		const wide = await this.request({
			method: "sampling/createMessage",
			params
		}, options);
		const outcome = this._wireCodec().samplingResultVariant(hasTools, wide);
		if (!outcome.ok) throw new SdkError(SdkErrorCode.InvalidResult, `Invalid sampling/createMessage result: ${outcome.reason === "invalid" ? outcome.message : outcome.reason}`);
		return outcome.value;
	}
	/**
	* Creates an elicitation request for the given parameters.
	* For backwards compatibility, `mode` may be omitted for form requests and will default to `"form"`.
	* @param params The parameters for the elicitation request.
	* @param options Optional request options.
	* @returns The result of the elicitation request.
	*
	* @deprecated Throws on a 2026-07-28-era request — use {@link index.inputRequired | inputRequired} (multi-round-trip)
	* instead. The 2025 push-style server-to-client request model is replaced by input_required
	* results in the 2026-07-28 protocol. If your factory serves both eras, this only works on the
	* legacy path.
	*/
	async elicitInput(params, options) {
		this._assertPushApiInServedEra("elicitation/create");
		switch (params.mode ?? "form") {
			case "url":
				if (!this._clientCapabilities?.elicitation?.url) throw new SdkError(SdkErrorCode.CapabilityNotSupported, "Client does not support url elicitation.");
				break;
			case "form": if (!this._clientCapabilities?.elicitation?.form) throw new SdkError(SdkErrorCode.CapabilityNotSupported, "Client does not support form elicitation.");
		}
		return this._sendElicitationLeg(params, options);
	}
	/**
	* The capability-check-free core of {@linkcode elicitInput}. The shim
	* uses it because its gate differs from the public checks: a bare
	* `elicitation: {}` counts as form support (the pre-mode rule), and
	* accepted content passes through unvalidated for parity with the
	* modern client driver (handlers validate via the schema-aware
	* `acceptedContent` overload and can re-ask).
	*/
	async _sendElicitationLeg(params, options, behavior) {
		const mode = params.mode ?? "form";
		const validateAcceptedContent = behavior?.validateAcceptedContent ?? true;
		switch (mode) {
			case "url": {
				const urlParams = params;
				return this.request({
					method: "elicitation/create",
					params: urlParams
				}, options);
			}
			case "form": {
				const formParams = params.mode === "form" ? params : {
					...params,
					mode: "form"
				};
				const result = await this.request({
					method: "elicitation/create",
					params: formParams
				}, options);
				if (validateAcceptedContent && result.action === "accept" && result.content && formParams.requestedSchema) try {
					const validationResult = this._jsonSchemaValidator.getValidator(formParams.requestedSchema)(result.content);
					if (!validationResult.valid) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Elicitation response content does not match requested schema: ${validationResult.errorMessage}`);
				} catch (error) {
					if (error instanceof ProtocolError) throw error;
					throw new ProtocolError(ProtocolErrorCode.InternalError, `Error validating elicitation response: ${error instanceof Error ? error.message : String(error)}`);
				}
				return result;
			}
		}
	}
	/**
	* Creates a reusable callback that, when invoked, will send a `notifications/elicitation/complete`
	* notification for the specified elicitation ID.
	*
	* The notification (and the `elicitationId` it references) exists only on protocol revision
	* 2025-11-25 — the 2026-07-28 revision removed both. On a connection negotiated at 2026-07-28 the
	* returned callback rejects with a typed local error before anything reaches the transport
	* (the method is not part of that revision's wire registry).
	*
	* @param elicitationId The ID of the elicitation to mark as complete.
	* @param options Optional notification options. Useful when the completion notification should be related to a prior request.
	* @returns A function that emits the completion notification when awaited.
	*/
	createElicitationCompletionNotifier(elicitationId, options) {
		if (!this._clientCapabilities?.elicitation?.url) throw new SdkError(SdkErrorCode.CapabilityNotSupported, "Client does not support URL elicitation (required for notifications/elicitation/complete)");
		return () => this.notification({
			method: "notifications/elicitation/complete",
			params: { elicitationId }
		}, options);
	}
	/**
	* Requests the list of roots from the client.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577).
	* Throws on a 2026-07-28-era request — use {@link index.inputRequired | inputRequired} (multi-round-trip) instead,
	* or migrate to passing paths via tool parameters, resource URIs, or configuration. The 2025
	* push-style server-to-client request model is replaced by input_required results in the
	* 2026-07-28 protocol. If your factory serves both eras, this only works on the legacy path.
	*/
	async listRoots(params, options) {
		this._assertPushApiInServedEra("roots/list");
		return this.request({
			method: "roots/list",
			params
		}, options);
	}
	/**
	* Sends a logging message to the client, if connected.
	* Note: You only need to send the parameters object, not the entire JSON-RPC message.
	* @see {@linkcode LoggingMessageNotification}
	* @param params
	* @param sessionId Optional for stateless transports and backward compatibility.
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577).
	* Remains functional during the deprecation window (at least twelve months).
	* Migrate to stderr logging (STDIO servers) or OpenTelemetry.
	*/
	async sendLoggingMessage(params, sessionId) {
		if (this._capabilities.logging && !this.isMessageIgnored(params.level, sessionId)) return this.notification({
			method: "notifications/message",
			params
		});
	}
	async sendResourceUpdated(params) {
		return this.notification({
			method: "notifications/resources/updated",
			params
		});
	}
	async sendResourceListChanged() {
		return this.notification({ method: "notifications/resources/list_changed" });
	}
	async sendToolListChanged() {
		return this.notification({ method: "notifications/tools/list_changed" });
	}
	async sendPromptListChanged() {
		return this.notification({ method: "notifications/prompts/list_changed" });
	}
};
/**
* The capability set a server advertises on `server/discover`. Pure — never
* mutates the input; the legacy `initialize` advertisement is untouched.
*
* The serving entries serve `subscriptions/listen` themselves, so the
* `listChanged` and `resources.subscribe` capability bits are advertised
* as-is: a modern-era client uses them to decide which notification types to
* request on its listen filter.
*/
function discoverAdvertisedCapabilities(capabilities) {
	return { ...capabilities };
}
function toolInputElementCount(value, max) {
	let count = 0;
	const stack = [value];
	while (stack.length > 0) {
		const node = stack.pop();
		if (node === null || typeof node !== "object") continue;
		if (Array.isArray(node)) for (const child of node) {
			if (++count > max) return count;
			if (child !== null && typeof child === "object") stack.push(child);
		}
		else for (const key in node) {
			if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
			if (++count > max) return count;
			const child = node[key];
			if (child !== null && typeof child === "object") stack.push(child);
		}
	}
	return count;
}
function resolveMaxToolInputElements(value) {
	if (value === void 0 || value === Infinity) return void 0;
	if (typeof value !== "number" || Number.isNaN(value) || value < 1) throw new RangeError(`maxToolInputElements must be a number of at least 1, or Infinity, got ${String(value)}`);
	return value;
}
/**
* High-level MCP server that provides a simpler API for working with resources, tools, and prompts.
* For advanced usage (like sending notifications or setting custom request handlers), use the underlying
* {@linkcode Server} instance available via the {@linkcode McpServer.server | server} property.
*
* @example
* ```ts source="./mcp.examples.ts#McpServer_basicUsage"
* const server = new McpServer({
*     name: 'my-server',
*     version: '1.0.0'
* });
* ```
*/
var McpServer = class {
	/**
	* The underlying {@linkcode Server} instance, useful for advanced operations like sending notifications.
	*/
	server;
	_maxToolInputElements;
	_registeredResources = {};
	_registeredResourceTemplates = {};
	_registeredTools = {};
	_registeredPrompts = {};
	/** Per-tool JSON-converted `inputSchema`, filled on first use by `toolInputSchemaJson()`. */
	_toolInputSchemaJson = {};
	/**
	* The JSON-serialized `inputSchema` of a registered tool, or `undefined`
	* when no such tool is registered. Used by the HTTP entry's pre-dispatch
	* SEP-2243 `Mcp-Param-*` validation step (which needs the same JSON Schema
	* `tools/list` would emit, before dispatch reaches the handler).
	*
	* @internal
	*/
	toolInputSchemaJson(name) {
		const tool = this._registeredTools[name];
		if (tool === void 0 || !tool.enabled) return void 0;
		if (Object.hasOwn(this._toolInputSchemaJson, name)) return this._toolInputSchemaJson[name];
		if (tool.inputSchema === void 0) return EMPTY_OBJECT_JSON_SCHEMA;
		try {
			const json = standardSchemaToJsonSchema(tool.inputSchema, "input");
			this._toolInputSchemaJson[name] = json;
			return json;
		} catch {
			return;
		}
	}
	constructor(serverInfo, options) {
		this.server = new Server(serverInfo, options);
		this._maxToolInputElements = resolveMaxToolInputElements(options?.maxToolInputElements);
		if (options?.capabilities?.tools) this.setToolRequestHandlers();
		if (options?.capabilities?.resources) this.setResourceRequestHandlers();
		if (options?.capabilities?.prompts) this.setPromptRequestHandlers();
	}
	/**
	* Attaches to the given transport, starts it, and starts listening for messages.
	*
	* The `server` object assumes ownership of the {@linkcode Transport}, replacing any callbacks that have already been set, and expects that it is the only user of the {@linkcode Transport} instance going forward.
	*
	* @example
	* ```ts source="./mcp.examples.ts#McpServer_connect_stdio"
	* const server = new McpServer({ name: 'my-server', version: '1.0.0' });
	* const transport = new StdioServerTransport();
	* await server.connect(transport);
	* ```
	*/
	async connect(transport) {
		if (supportsScopeChallengeResolver(transport)) transport.setScopeChallengeResolver((context) => this.resolveScopeChallenge(context));
		return await this.server.connect(transport);
	}
	/**
	* Closes the connection.
	*/
	async close() {
		await this.server.close();
	}
	/** @internal */
	resolveScopeChallenge = (context) => {
		switch (context.request.method) {
			case "tools/call": {
				const toolName = context.request.params?.name;
				if (typeof toolName !== "string") return;
				const tool = this._registeredTools[toolName];
				if (tool === void 0 || !tool.enabled) return;
				return tool.scopeChallenge?.(context);
			}
			case "resources/read": {
				const resourceUri = context.request.params?.uri;
				if (typeof resourceUri !== "string") return;
				let uri;
				try {
					uri = new URL(resourceUri);
				} catch {
					return;
				}
				const resource = this._registeredResources[uri.toString()];
				if (resource !== void 0) return resource.enabled ? resource.scopeChallenge?.(context) : void 0;
				for (const template of Object.values(this._registeredResourceTemplates)) if (template.resourceTemplate.uriTemplate.match(uri.toString())) return template.enabled ? template.scopeChallenge?.(context) : void 0;
				return;
			}
			case "prompts/get": {
				const promptName = context.request.params?.name;
				if (typeof promptName !== "string") return;
				const prompt = this._registeredPrompts[promptName];
				if (prompt === void 0 || !prompt.enabled) return;
				return prompt.scopeChallenge?.(context);
			}
			default: return;
		}
	};
	_toolHandlersInitialized = false;
	setToolRequestHandlers() {
		if (this._toolHandlersInitialized) return;
		this.server.assertCanSetRequestHandler("tools/list");
		this.server.assertCanSetRequestHandler("tools/call");
		this.server.registerCapabilities({ tools: { listChanged: this.server.getCapabilities().tools?.listChanged ?? true } });
		this.server.setRequestHandler("tools/list", () => ({ tools: Object.entries(this._registeredTools).filter(([, tool]) => tool.enabled).map(([name, tool]) => {
			const toolDefinition = {
				name,
				title: tool.title,
				description: tool.description,
				inputSchema: tool.inputSchema ? convertListedInputSchema(name, tool.inputSchema) : EMPTY_OBJECT_JSON_SCHEMA,
				annotations: tool.annotations,
				icons: tool.icons,
				execution: tool.execution,
				_meta: tool._meta
			};
			if (tool.outputSchema) toolDefinition.outputSchema = standardSchemaToJsonSchema(tool.outputSchema, "output");
			return toolDefinition;
		}) }));
		this.server.setRequestHandler("tools/call", async (request, ctx) => {
			const tool = this._registeredTools[request.params.name];
			if (!tool) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Tool ${request.params.name} not found`);
			if (!tool.enabled) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Tool ${request.params.name} disabled`);
			try {
				const args = await this.validateToolInput(tool, request.params.arguments, request.params.name);
				const result = await this.executeToolHandler(tool, args, ctx);
				await this.validateToolOutput(tool, result, request.params.name);
				if (isInputRequiredResult(result)) return result;
				return this.server.projectCallToolResult(result, tool.outputSchemaJson);
			} catch (error) {
				if (error instanceof ProtocolError && error.code === ProtocolErrorCode.UrlElicitationRequired) throw error;
				return this.createToolError(error instanceof Error ? error.message : String(error));
			}
		});
		this._toolHandlersInitialized = true;
	}
	/**
	* Creates a tool error result.
	*
	* @param errorMessage - The error message.
	* @returns The tool error result.
	*/
	createToolError(errorMessage) {
		return {
			content: [{
				type: "text",
				text: errorMessage
			}],
			isError: true
		};
	}
	/**
	* Validates tool input arguments against the tool's input schema.
	*/
	async validateToolInput(tool, args, toolName) {
		if (this._maxToolInputElements !== void 0 && toolInputElementCount(args, this._maxToolInputElements) > this._maxToolInputElements) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Invalid arguments for tool ${toolName}: arguments contain more than the maximum of ${this._maxToolInputElements} elements`);
		if (!tool.inputSchema) return;
		const parseResult = await validateStandardSchema(tool.inputSchema, args ?? {});
		if (!parseResult.success) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Input validation error: Invalid arguments for tool ${toolName}: ${parseResult.error}`);
		return parseResult.data;
	}
	/**
	* Validates tool output against the tool's output schema.
	*/
	async validateToolOutput(tool, result, toolName) {
		if (!tool.outputSchema) return;
		if (isInputRequiredResult(result)) return;
		if (result.isError) return;
		if (result.structuredContent === void 0) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Output validation error: Tool ${toolName} has an output schema but no structured content was provided`);
		const parseResult = await validateStandardSchema(tool.outputSchema, result.structuredContent);
		if (!parseResult.success) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Output validation error: Invalid structured content for tool ${toolName}: ${parseResult.error}`);
	}
	/**
	* Executes a tool handler.
	*/
	async executeToolHandler(tool, args, ctx) {
		return tool.executor(args, ctx);
	}
	_completionHandlerInitialized = false;
	setCompletionRequestHandler() {
		if (this._completionHandlerInitialized) return;
		this.server.assertCanSetRequestHandler("completion/complete");
		this.server.registerCapabilities({ completions: {} });
		this.server.setRequestHandler("completion/complete", async (request) => {
			switch (request.params.ref.type) {
				case "ref/prompt":
					assertCompleteRequestPrompt(request);
					return this.handlePromptCompletion(request, request.params.ref);
				case "ref/resource":
					assertCompleteRequestResourceTemplate(request);
					return this.handleResourceCompletion(request, request.params.ref);
				default: throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Invalid completion reference: ${request.params.ref}`);
			}
		});
		this._completionHandlerInitialized = true;
	}
	async handlePromptCompletion(request, ref) {
		const prompt = this._registeredPrompts[ref.name];
		if (!prompt) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Prompt ${ref.name} not found`);
		if (!prompt.enabled) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Prompt ${ref.name} disabled`);
		if (!prompt.argsSchema) return EMPTY_COMPLETION_RESULT;
		const field = unwrapOptionalSchema(getSchemaShape(prompt.argsSchema)?.[request.params.argument.name]);
		if (!isCompletable(field)) return EMPTY_COMPLETION_RESULT;
		const completer = getCompleter(field);
		if (!completer) return EMPTY_COMPLETION_RESULT;
		return createCompletionResult(await completer(request.params.argument.value, request.params.context));
	}
	async handleResourceCompletion(request, ref) {
		const template = Object.values(this._registeredResourceTemplates).find((t) => t.resourceTemplate.uriTemplate.toString() === ref.uri);
		if (!template) {
			if (this._registeredResources[ref.uri]) return EMPTY_COMPLETION_RESULT;
			throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Resource template ${request.params.ref.uri} not found`);
		}
		const completer = template.resourceTemplate.completeCallback(request.params.argument.name);
		if (!completer) return EMPTY_COMPLETION_RESULT;
		return createCompletionResult(await completer(request.params.argument.value, request.params.context));
	}
	_resourceHandlersInitialized = false;
	setResourceRequestHandlers() {
		if (this._resourceHandlersInitialized) return;
		this.server.assertCanSetRequestHandler("resources/list");
		this.server.assertCanSetRequestHandler("resources/templates/list");
		this.server.assertCanSetRequestHandler("resources/read");
		this.server.registerCapabilities({ resources: { listChanged: this.server.getCapabilities().resources?.listChanged ?? true } });
		this.server.setRequestHandler("resources/list", async (_request, ctx) => {
			const resources = Object.entries(this._registeredResources).filter(([_, resource]) => resource.enabled).map(([uri, resource]) => ({
				uri,
				name: resource.name,
				...resource.metadata
			}));
			const templateResources = [];
			for (const template of Object.values(this._registeredResourceTemplates)) {
				if (!template.resourceTemplate.listCallback) continue;
				const result = await template.resourceTemplate.listCallback(ctx);
				for (const resource of result.resources) templateResources.push({
					...template.metadata,
					...resource
				});
			}
			return { resources: [...resources, ...templateResources] };
		});
		this.server.setRequestHandler("resources/templates/list", async () => {
			return { resourceTemplates: Object.entries(this._registeredResourceTemplates).map(([name, template]) => ({
				name,
				uriTemplate: template.resourceTemplate.uriTemplate.toString(),
				...template.metadata
			})) };
		});
		this.server.setRequestHandler("resources/read", async (request, ctx) => {
			let uri;
			try {
				uri = new URL(request.params.uri);
			} catch {
				throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Resource URI ${request.params.uri} is invalid`, {
					uri: request.params.uri,
					reason: "invalid_uri"
				});
			}
			const resource = this._registeredResources[uri.toString()];
			if (resource) {
				if (!resource.enabled) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Resource ${uri} disabled`);
				return attachCacheHintFallback(await resource.readCallback(uri, ctx), resource.cacheHint);
			}
			for (const template of Object.values(this._registeredResourceTemplates)) {
				const variables = template.resourceTemplate.uriTemplate.match(uri.toString());
				if (variables) {
					if (!template.enabled) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Resource template ${template.resourceTemplate.uriTemplate} disabled`);
					return attachCacheHintFallback(await template.readCallback(uri, variables, ctx), template.cacheHint);
				}
			}
			throw new ResourceNotFoundError(request.params.uri);
		});
		this._resourceHandlersInitialized = true;
	}
	_promptHandlersInitialized = false;
	setPromptRequestHandlers() {
		if (this._promptHandlersInitialized) return;
		this.server.assertCanSetRequestHandler("prompts/list");
		this.server.assertCanSetRequestHandler("prompts/get");
		this.server.registerCapabilities({ prompts: { listChanged: this.server.getCapabilities().prompts?.listChanged ?? true } });
		this.server.setRequestHandler("prompts/list", () => ({ prompts: Object.entries(this._registeredPrompts).filter(([, prompt]) => prompt.enabled).map(([name, prompt]) => {
			return {
				name,
				title: prompt.title,
				description: prompt.description,
				arguments: prompt.argsSchema ? promptArgumentsFromStandardSchema(prompt.argsSchema) : void 0,
				icons: prompt.icons,
				_meta: prompt._meta
			};
		}) }));
		this.server.setRequestHandler("prompts/get", async (request, ctx) => {
			const prompt = this._registeredPrompts[request.params.name];
			if (!prompt) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Prompt ${request.params.name} not found`);
			if (!prompt.enabled) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Prompt ${request.params.name} disabled`);
			return prompt.handler(request.params.arguments, ctx);
		});
		this._promptHandlersInitialized = true;
	}
	registerResource(name, uriOrTemplate, config, readCallback) {
		const { cacheHint, scopeChallenge, ...resourceMetadata } = config;
		const metadata = resourceMetadata;
		if (cacheHint !== void 0) assertValidCacheHint(cacheHint, `resource ${name}`);
		if (typeof uriOrTemplate === "string") {
			if (this._registeredResources[uriOrTemplate]) throw new Error(`Resource ${uriOrTemplate} is already registered`);
			const registeredResource = this._createRegisteredResource(name, config.title, uriOrTemplate, metadata, scopeChallenge, readCallback);
			if (cacheHint !== void 0) registeredResource.cacheHint = cacheHint;
			this.setResourceRequestHandlers();
			this.sendResourceListChanged();
			return registeredResource;
		} else {
			if (this._registeredResourceTemplates[name]) throw new Error(`Resource template ${name} is already registered`);
			const registeredResourceTemplate = this._createRegisteredResourceTemplate(name, config.title, uriOrTemplate, metadata, scopeChallenge, readCallback);
			if (cacheHint !== void 0) registeredResourceTemplate.cacheHint = cacheHint;
			this.setResourceRequestHandlers();
			this.sendResourceListChanged();
			return registeredResourceTemplate;
		}
	}
	_createRegisteredResource(name, title, uri, metadata, scopeChallenge, readCallback) {
		const registeredResource = {
			name,
			title,
			metadata,
			readCallback,
			scopeChallenge,
			enabled: true,
			disable: () => registeredResource.update({ enabled: false }),
			enable: () => registeredResource.update({ enabled: true }),
			remove: () => registeredResource.update({ uri: null }),
			update: (updates) => {
				if (updates.uri !== void 0 && updates.uri !== uri) {
					delete this._registeredResources[uri];
					if (updates.uri) this._registeredResources[updates.uri] = registeredResource;
				}
				if (updates.name !== void 0) registeredResource.name = updates.name;
				if (updates.title !== void 0) registeredResource.title = updates.title;
				if (updates.metadata !== void 0) registeredResource.metadata = updates.metadata;
				if (updates.callback !== void 0) registeredResource.readCallback = updates.callback;
				if (updates.scopeChallenge !== void 0) registeredResource.scopeChallenge = updates.scopeChallenge === null ? void 0 : updates.scopeChallenge;
				if (updates.enabled !== void 0) registeredResource.enabled = updates.enabled;
				this.sendResourceListChanged();
			}
		};
		this._registeredResources[uri] = registeredResource;
		return registeredResource;
	}
	_createRegisteredResourceTemplate(name, title, template, metadata, scopeChallenge, readCallback) {
		const registeredResourceTemplate = {
			resourceTemplate: template,
			title,
			metadata,
			readCallback,
			scopeChallenge,
			enabled: true,
			disable: () => registeredResourceTemplate.update({ enabled: false }),
			enable: () => registeredResourceTemplate.update({ enabled: true }),
			remove: () => registeredResourceTemplate.update({ name: null }),
			update: (updates) => {
				if (updates.name !== void 0 && updates.name !== name) {
					delete this._registeredResourceTemplates[name];
					if (updates.name) this._registeredResourceTemplates[updates.name] = registeredResourceTemplate;
				}
				if (updates.title !== void 0) registeredResourceTemplate.title = updates.title;
				if (updates.template !== void 0) registeredResourceTemplate.resourceTemplate = updates.template;
				if (updates.metadata !== void 0) registeredResourceTemplate.metadata = updates.metadata;
				if (updates.callback !== void 0) registeredResourceTemplate.readCallback = updates.callback;
				if (updates.scopeChallenge !== void 0) registeredResourceTemplate.scopeChallenge = updates.scopeChallenge === null ? void 0 : updates.scopeChallenge;
				if (updates.enabled !== void 0) registeredResourceTemplate.enabled = updates.enabled;
				this.sendResourceListChanged();
			}
		};
		this._registeredResourceTemplates[name] = registeredResourceTemplate;
		const variableNames = template.uriTemplate.variableNames;
		if (Array.isArray(variableNames) && variableNames.some((v) => !!template.completeCallback(v))) this.setCompletionRequestHandler();
		return registeredResourceTemplate;
	}
	_createRegisteredPrompt(name, title, description, argsSchema, callback, icons, scopeChallenge, _meta) {
		let currentArgsSchema = argsSchema;
		let currentCallback = callback;
		const registeredPrompt = {
			title,
			description,
			argsSchema,
			icons,
			scopeChallenge,
			_meta,
			handler: createPromptHandler(name, argsSchema, callback),
			enabled: true,
			disable: () => registeredPrompt.update({ enabled: false }),
			enable: () => registeredPrompt.update({ enabled: true }),
			remove: () => registeredPrompt.update({ name: null }),
			update: (updates) => {
				if (updates.name !== void 0 && updates.name !== name) {
					delete this._registeredPrompts[name];
					if (updates.name) this._registeredPrompts[updates.name] = registeredPrompt;
				}
				if (updates.title !== void 0) registeredPrompt.title = updates.title;
				if (updates.description !== void 0) registeredPrompt.description = updates.description;
				if (updates.icons !== void 0) registeredPrompt.icons = updates.icons;
				if (updates.scopeChallenge !== void 0) registeredPrompt.scopeChallenge = updates.scopeChallenge === null ? void 0 : updates.scopeChallenge;
				if (updates._meta !== void 0) registeredPrompt._meta = updates._meta;
				let needsHandlerRegen = false;
				if (updates.argsSchema !== void 0) {
					registeredPrompt.argsSchema = updates.argsSchema;
					currentArgsSchema = updates.argsSchema;
					needsHandlerRegen = true;
				}
				if (updates.callback !== void 0) {
					currentCallback = updates.callback;
					needsHandlerRegen = true;
				}
				if (needsHandlerRegen) registeredPrompt.handler = createPromptHandler(name, currentArgsSchema, currentCallback);
				if (updates.enabled !== void 0) registeredPrompt.enabled = updates.enabled;
				this.sendPromptListChanged();
			}
		};
		this._registeredPrompts[name] = registeredPrompt;
		if (argsSchema) {
			const shape = getSchemaShape(argsSchema);
			if (shape) {
				if (Object.values(shape).some((field) => {
					return isCompletable(unwrapOptionalSchema(field));
				})) this.setCompletionRequestHandler();
			}
		}
		return registeredPrompt;
	}
	_createRegisteredTool(name, title, description, inputSchema, outputSchema, annotations, icons, execution, scopeChallenge, _meta, handler) {
		validateAndWarnToolName(name);
		let currentHandler = handler;
		let outputSchemaJson;
		const registeredTool = {
			title,
			description,
			inputSchema,
			outputSchema,
			get outputSchemaJson() {
				return outputSchemaJson ??= convertOutputSchemaJson(registeredTool.outputSchema);
			},
			set outputSchemaJson(value) {
				outputSchemaJson = value;
			},
			annotations,
			icons,
			execution,
			scopeChallenge,
			_meta,
			handler,
			executor: createToolExecutor(inputSchema, handler),
			enabled: true,
			disable: () => registeredTool.update({ enabled: false }),
			enable: () => registeredTool.update({ enabled: true }),
			remove: () => registeredTool.update({ name: null }),
			update: (updates) => {
				if (updates.name !== void 0 && updates.name !== name) {
					if (typeof updates.name === "string") validateAndWarnToolName(updates.name);
					delete this._registeredTools[name];
					delete this._toolInputSchemaJson[name];
					if (updates.name) {
						delete this._toolInputSchemaJson[updates.name];
						this._registeredTools[updates.name] = registeredTool;
						name = updates.name;
					}
				}
				if (updates.title !== void 0) registeredTool.title = updates.title;
				if (updates.description !== void 0) registeredTool.description = updates.description;
				let needsExecutorRegen = false;
				if (updates.paramsSchema !== void 0) {
					registeredTool.inputSchema = updates.paramsSchema;
					delete this._toolInputSchemaJson[name];
					needsExecutorRegen = true;
				}
				if (updates.callback !== void 0) {
					registeredTool.handler = updates.callback;
					currentHandler = updates.callback;
					needsExecutorRegen = true;
				}
				if (needsExecutorRegen) registeredTool.executor = createToolExecutor(registeredTool.inputSchema, currentHandler);
				if (updates.outputSchema !== void 0) {
					registeredTool.outputSchema = updates.outputSchema;
					registeredTool.outputSchemaJson = convertOutputSchemaJson(updates.outputSchema);
				}
				if (updates.annotations !== void 0) registeredTool.annotations = updates.annotations;
				if (updates.icons !== void 0) registeredTool.icons = updates.icons;
				if (updates.scopeChallenge !== void 0) registeredTool.scopeChallenge = updates.scopeChallenge === null ? void 0 : updates.scopeChallenge;
				if (updates._meta !== void 0) registeredTool._meta = updates._meta;
				if (updates.enabled !== void 0) registeredTool.enabled = updates.enabled;
				this.sendToolListChanged();
			}
		};
		this._registeredTools[name] = registeredTool;
		this.setToolRequestHandlers();
		this.sendToolListChanged();
		return registeredTool;
	}
	registerTool(name, config, cb) {
		if (this._registeredTools[name]) throw new Error(`Tool ${name} is already registered`);
		const { title, description, inputSchema, outputSchema, annotations, icons, scopeChallenge, _meta } = config;
		return this._createRegisteredTool(name, title, description, normalizeRawShapeSchema(inputSchema), normalizeRawShapeSchema(outputSchema), annotations, icons, void 0, scopeChallenge, _meta, cb);
	}
	registerPrompt(name, config, cb) {
		if (this._registeredPrompts[name]) throw new Error(`Prompt ${name} is already registered`);
		const { title, description, argsSchema, icons, scopeChallenge, _meta } = config;
		const registeredPrompt = this._createRegisteredPrompt(name, title, description, normalizeRawShapeSchema(argsSchema), cb, icons, scopeChallenge, _meta);
		this.setPromptRequestHandlers();
		this.sendPromptListChanged();
		return registeredPrompt;
	}
	/**
	* Checks if the server is connected to a transport.
	* @returns `true` if the server is connected
	*/
	isConnected() {
		return this.server.transport !== void 0;
	}
	/**
	* Sends a logging message to the client, if connected.
	* Note: You only need to send the parameters object, not the entire JSON-RPC message.
	* @see {@linkcode LoggingMessageNotification}
	* @param params
	* @param sessionId Optional for stateless transports and backward compatibility.
	*
	* @example
	* ```ts source="./mcp.examples.ts#McpServer_sendLoggingMessage_basic"
	* await server.sendLoggingMessage({
	*     level: 'info',
	*     data: 'Processing complete'
	* });
	* ```
	*
	* @deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577).
	* Remains functional during the deprecation window (at least twelve months).
	* Migrate to stderr logging (STDIO servers) or OpenTelemetry.
	*/
	async sendLoggingMessage(params, sessionId) {
		return this.server.sendLoggingMessage(params, sessionId);
	}
	/**
	* Sends a resource list changed event to the client, if connected.
	*/
	sendResourceListChanged() {
		if (this.isConnected()) this.server.sendResourceListChanged();
	}
	/**
	* Sends a tool list changed event to the client, if connected.
	*/
	sendToolListChanged() {
		if (this.isConnected()) this.server.sendToolListChanged();
	}
	/**
	* Sends a prompt list changed event to the client, if connected.
	*/
	sendPromptListChanged() {
		if (this.isConnected()) this.server.sendPromptListChanged();
	}
};
/**
* Creates an executor that invokes the handler with the appropriate arguments.
* When `inputSchema` is defined, the handler is called with `(args, ctx)`.
* When `inputSchema` is undefined, the handler is called with just `(ctx)`.
*/
function createToolExecutor(inputSchema, handler) {
	if (inputSchema) {
		const callback$1 = handler;
		return async (args, ctx) => callback$1(args, ctx);
	}
	const callback = handler;
	return async (_args, ctx) => callback(ctx);
}
const EMPTY_OBJECT_JSON_SCHEMA = {
	type: "object",
	properties: {}
};
/** Converts a tool's `inputSchema` for `tools/list` and warns on an invalid SEP-2243 `x-mcp-header` declaration. */
function convertListedInputSchema(name, inputSchema) {
	const json = standardSchemaToJsonSchema(inputSchema, "input");
	const scan = scanXMcpHeaderDeclarations(json);
	if (!scan.valid) console.warn(`[mcp-sdk] tool '${name}' carries an invalid x-mcp-header declaration and will be excluded by conforming Streamable HTTP clients: ${scan.reason}`);
	return json;
}
/**
* Convert a registered `outputSchema` to JSON Schema, memoised on {@link RegisteredTool.outputSchemaJson}
* so `tools/call` passes the SAME advertised schema to the wire codec's `projectCallToolResult` that
* `tools/list` emits (and that the 2025 codec's `encodeResult('tools/list', …)` may wrap). A conversion
* failure yields `undefined` so the failure surfaces where it always has (`tools/list`).
*/
function convertOutputSchemaJson(outputSchema) {
	if (outputSchema === void 0) return void 0;
	try {
		return standardSchemaToJsonSchema(outputSchema, "output");
	} catch {
		return;
	}
}
/**
* Creates a type-safe prompt handler that captures the schema and callback in a closure.
* This eliminates the need for type assertions at the call site.
*/
function createPromptHandler(name, argsSchema, callback) {
	if (argsSchema) {
		const typedCallback = callback;
		return async (args, ctx) => {
			const parseResult = await validateStandardSchema(argsSchema, args ?? {});
			if (!parseResult.success) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Invalid arguments for prompt ${name}: ${parseResult.error}`);
			return typedCallback(parseResult.data, ctx);
		};
	} else {
		const typedCallback = callback;
		return async (_args, ctx) => {
			return typedCallback(ctx);
		};
	}
}
function createCompletionResult(suggestions) {
	return { completion: {
		values: suggestions.map(String).slice(0, 100),
		total: suggestions.length,
		hasMore: suggestions.length > 100
	} };
}
const EMPTY_COMPLETION_RESULT = { completion: {
	values: [],
	hasMore: false
} };
/** @internal Gets the shape of a Zod object schema */
function getSchemaShape(schema) {
	const candidate = schema;
	if (candidate.shape && typeof candidate.shape === "object") return candidate.shape;
}
/** @internal Checks if a Zod schema is optional */
function isOptionalSchema(schema) {
	return schema?.type === "optional";
}
/** @internal Unwraps an optional Zod schema */
function unwrapOptionalSchema(schema) {
	if (!isOptionalSchema(schema)) return schema;
	return schema.def?.innerType ?? schema;
}
//#endregion
//#region node_modules/@modelcontextprotocol/server/dist/stdio.mjs
/**
* Marks a stdout `'error'` listener that a closed transport left attached purely to
* swallow late write failures (see {@link StdioServerTransport.close}). A fresh
* transport taking over the same stream removes listeners carrying this tag in
* `start()`, so repeated create→close cycles on the process-global `process.stdout`
* don't accumulate listeners.
*/
const swallowsErrorsAfterClose = Symbol("swallowsErrorsAfterClose");
/**
* Server transport for stdio: this communicates with an MCP client by reading from the current process' `stdin` and writing to `stdout`.
*
* This transport is only available in Node.js environments.
*
* When the client closes its end of the pipe (stdin reaches end-of-file), the transport
* closes itself and fires `onclose`, per the MCP stdio binding's guidance that servers
* should exit promptly when their standard input is closed. A server that holds no other
* keep-alive handles will then exit naturally. Requests still in flight when stdin ends are
* aborted and not answered; a client that expects responses keeps stdin open until it has
* read them.
*
* @example
* ```ts source="./stdio.examples.ts#StdioServerTransport_basicUsage"
* const server = new McpServer({ name: 'my-server', version: '1.0.0' });
* const transport = new StdioServerTransport();
* await server.connect(transport);
* ```
*/
var StdioServerTransport = class {
	_readBuffer;
	_started = false;
	_closed = false;
	constructor(_stdin = process$1.stdin, _stdout = process$1.stdout, options) {
		this._stdin = _stdin;
		this._stdout = _stdout;
		this._readBuffer = new ReadBuffer({ maxBufferSize: options?.maxBufferSize });
	}
	onclose;
	onerror;
	onmessage;
	_ondata = (chunk) => {
		try {
			this._readBuffer.append(chunk);
			this.processReadBuffer();
		} catch (error) {
			this.onerror?.(error);
			this.close().catch(() => {});
		}
	};
	_onerror = (error) => {
		this.onerror?.(error);
	};
	_onstdouterror = (error) => {
		if (this._closed) return;
		this.onerror?.(error);
		this.close().catch(() => {});
	};
	_onstdinclose = () => {
		this.close().catch(() => {});
	};
	/**
	* Starts listening for messages on `stdin`.
	*/
	async start() {
		if (this._started) throw new Error("StdioServerTransport already started! If using Server class, note that connect() calls start() automatically.");
		this._started = true;
		for (const listener of this._stdout.listeners("error")) if (listener[swallowsErrorsAfterClose]) this._stdout.off("error", listener);
		if (this._stdin.readableEnded || this._stdin.destroyed) setImmediate(this._onstdinclose);
		this._stdin.on("data", this._ondata);
		this._stdin.on("error", this._onerror);
		this._stdin.on("end", this._onstdinclose);
		this._stdin.on("close", this._onstdinclose);
		this._stdout.on("error", this._onstdouterror);
	}
	processReadBuffer() {
		while (true) try {
			const message = this._readBuffer.readMessage();
			if (message === null) break;
			this.onmessage?.(message);
		} catch (error) {
			this.onerror?.(error);
		}
	}
	async close() {
		if (this._closed) return;
		this._closed = true;
		this._stdin.off("data", this._ondata);
		this._stdin.off("error", this._onerror);
		this._stdin.off("end", this._onstdinclose);
		this._stdin.off("close", this._onstdinclose);
		this._onstdouterror[swallowsErrorsAfterClose] = true;
		if (this._stdin.listenerCount("data") === 0) this._stdin.pause();
		this._readBuffer.clear();
		this.onclose?.();
	}
	send(message) {
		if (this._closed) return Promise.reject(/* @__PURE__ */ new Error("StdioServerTransport is closed"));
		return new Promise((resolve, reject) => {
			const json = serializeMessage(message);
			let settled = false;
			const onError = (error) => {
				if (settled) return;
				settled = true;
				this._stdout.off("error", onError);
				this._stdout.off("drain", onDrain);
				reject(error);
			};
			const onDrain = () => {
				if (settled) return;
				settled = true;
				this._stdout.off("error", onError);
				this._stdout.off("drain", onDrain);
				resolve();
			};
			this._stdout.once("error", onError);
			if (this._stdout.write(json)) {
				if (settled) return;
				settled = true;
				this._stdout.off("error", onError);
				resolve();
			} else if (!settled) this._stdout.once("drain", onDrain);
		});
	}
};
/**
* How long the probe-discard path waits for the probe instance to answer the
* requests it was delivered before closing it. The wait normally settles as
* soon as the DiscoverResult is handed to the wire (or immediately, when a
* delivered cancellation already settled the probe); the bound is a backstop
* so no edge can ever hold the connection's inbound pump indefinitely behind
* the discard.
*/
const DISCARD_ANSWER_TIMEOUT_MS = 3e3;
/**
* The transport a pinned instance is connected to: a thin channel that writes
* through to the entry-owned wire transport and receives the messages the
* entry forwards. The wire transport itself is never handed to an instance —
* that is what lets the entry discard an optimistic probe instance (close the
* channel) without tearing down the connection.
*/
var StdioConnectionChannel = class {
	onclose;
	onerror;
	onmessage;
	_closed = false;
	/** Request ids the entry delivered to the instance that the instance has not yet answered. */
	_pendingRequests = /* @__PURE__ */ new Set();
	_drainWaiters = [];
	constructor(_wire, _onInstanceClose, _outboundIntercept) {
		this._wire = _wire;
		this._onInstanceClose = _onInstanceClose;
		this._outboundIntercept = _outboundIntercept;
	}
	async start() {}
	async send(message, options) {
		if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
			const { id } = message;
			if (id !== void 0) this._settle(id);
		}
		if (this._closed) return;
		if (this._outboundIntercept?.(message) === "handled") return;
		return this._wire.send(message, options);
	}
	setProtocolVersion = (version) => {
		this._wire.setProtocolVersion?.(version);
	};
	/** Forwards one inbound message to the connected instance. */
	deliver(message, extra) {
		if (this._closed) return;
		if (isJSONRPCRequest(message)) this._pendingRequests.add(message.id);
		else if (isJSONRPCNotification(message) && message.method === "notifications/cancelled") {
			const cancelledId = message.params?.requestId;
			if (cancelledId !== void 0) this._settle(cancelledId);
		}
		this.onmessage?.(message, extra);
	}
	/**
	* Resolves once every request delivered to the instance has been answered
	* through {@linkcode send}, settled by a delivered cancellation, or the
	* channel has been closed and nothing further can be answered. The wait is
	* bounded by `timeoutMs` as a backstop so no edge can hold the caller
	* indefinitely; resolves `false` only when the bound elapsed with requests
	* still unanswered. Used by the probe-discard path so a probe request the
	* entry accepted is never silently dropped.
	*/
	async whenRequestsAnswered(timeoutMs) {
		if (this._closed || this._pendingRequests.size === 0) return true;
		return await new Promise((resolve) => {
			const waiter = () => {
				clearTimeout(timer);
				resolve(true);
			};
			const timer = setTimeout(() => {
				this._drainWaiters = this._drainWaiters.filter((pending) => pending !== waiter);
				resolve(false);
			}, timeoutMs);
			this._drainWaiters.push(waiter);
		});
	}
	async close() {
		if (this._closed) return;
		this._closed = true;
		this._pendingRequests.clear();
		this._releaseDrainWaiters();
		try {
			this._onInstanceClose();
		} finally {
			this.onclose?.();
		}
	}
	_settle(id) {
		this._pendingRequests.delete(id);
		if (this._pendingRequests.size === 0) this._releaseDrainWaiters();
	}
	_releaseDrainWaiters() {
		const waiters = this._drainWaiters;
		this._drainWaiters = [];
		for (const waiter of waiters) waiter();
	}
};
/**
* Classifies one message of the opening exchange with the same body-primary
* rules the HTTP entry applies per request: `initialize` is the legacy
* handshake unless it carries a valid modern envelope claim; a present claim
* is validated (never silently ignored); a claim-less message is 2025-era
* traffic. There is no header layer on stdio, so the body is the only signal.
*/
function classifyOpeningMessage(message) {
	const params = message.params;
	if (message.method === "initialize" && !carriesValidModernEnvelopeClaim(params)) {
		const requestedVersion = params !== null && typeof params === "object" && typeof params.protocolVersion === "string" ? params.protocolVersion : void 0;
		return {
			kind: "legacy",
			reason: "initialize",
			...requestedVersion !== void 0 && { requestedVersion }
		};
	}
	if (!hasEnvelopeClaim(params)) return {
		kind: "legacy",
		reason: "no-claim"
	};
	const meta = requestMetaOf(params);
	const firstIssue = (meta === void 0 ? [] : validateEnvelopeMeta(meta))[0];
	if (firstIssue !== void 0) return {
		kind: "invalid-envelope",
		issue: firstIssue
	};
	const claimedVersion = envelopeClaimVersion(params);
	if (claimedVersion === void 0 || !SUPPORTED_MODERN_PROTOCOL_VERSIONS.includes(claimedVersion)) return {
		kind: "unsupported-revision",
		requested: claimedVersion ?? "unknown"
	};
	return {
		kind: "modern",
		revision: claimedVersion,
		classification: {
			era: "modern",
			revision: claimedVersion
		}
	};
}
/**
* Serves MCP over stdio from a server factory, owning the era decision for
* the connection: the opening exchange selects the era, ONE instance from the
* factory is pinned for the connection lifetime, and everything after passes
* straight through to it. See the module documentation for the opening rules.
*
* ```ts
* import { serveStdio } from '@modelcontextprotocol/server/stdio';
*
* serveStdio(() => {
*     const server = new McpServer({ name: 'my-server', version: '1.0.0' }, { capabilities: { tools: {} } });
*     // register tools/resources/prompts once — the same factory serves both eras
*     return server;
* });
* ```
*/
function serveStdio(factory, options = {}) {
	const legacyMode = options.legacy ?? "serve";
	const wire = options.transport ?? new StdioServerTransport();
	let state = { phase: "opening" };
	/** Channel currently being discarded (its close must not tear the connection down). */
	let discarding;
	let closing = false;
	/**
	* Whether the connection has been torn down (`handle.close()` or the wire
	* closing). The opening arms re-check this after every await: a close can
	* race factory construction, and the continuation must neither resurrect
	* the connection state nor keep a late-resolved instance around.
	*/
	const isTornDown = () => closing || state.phase === "closed";
	const reportError = (error) => {
		try {
			options.onerror?.(error);
		} catch {}
	};
	const writeErrorResponse = (id, code, message, data) => wire.send({
		jsonrpc: "2.0",
		id,
		error: {
			code,
			message,
			...data !== void 0 && { data }
		}
	}).catch((error) => reportError(toError(error)));
	/**
	* Entry-handled `subscriptions/listen` for this connection: holds the
	* active subscriptions, serves inbound listen / cancelled-of-listen
	* before the pinned instance is consulted, and rewrites the instance's
	* outbound change notifications onto the active subscriptions. Only
	* consulted on a modern-pinned connection — on a legacy connection
	* change notifications pass straight through (the 2025 unsolicited
	* delivery model is unchanged).
	*/
	const listenRouter = new StdioListenRouter(options.maxSubscriptions ?? 1024);
	/** Outbound intercept installed on a modern instance's channel. */
	const modernOutboundIntercept = (message) => {
		if (!isJSONRPCNotification(message)) return void 0;
		const routed = listenRouter.routeOutbound(message);
		if (routed === "passthrough") return void 0;
		for (const stamped of routed) wire.send({
			jsonrpc: "2.0",
			...stamped
		}).catch((error) => reportError(toError(error)));
		return "handled";
	};
	/**
	* Entry-handled inbound listen routing for a modern-pinned connection.
	* Returns `true` when the message was served at the entry and must NOT
	* be delivered to the pinned instance.
	*/
	const tryServeListen = async (message) => {
		if (isJSONRPCRequest(message) && message.method === "subscriptions/listen") {
			const meta = requestMetaOf(message.params);
			const issue = hasEnvelopeClaim(message.params) ? (meta === void 0 ? [] : validateEnvelopeMeta(meta))[0] : {
				key: "_meta",
				problem: "the per-request envelope is required on protocol revision 2026-07-28"
			};
			const claimedVersion = envelopeClaimVersion(message.params);
			let reply;
			if (issue !== void 0) reply = {
				jsonrpc: "2.0",
				id: message.id,
				error: {
					code: -32602,
					message: `Invalid _meta envelope: ${issue.key}: ${issue.problem}`
				}
			};
			else if (claimedVersion === void 0 || !SUPPORTED_MODERN_PROTOCOL_VERSIONS.includes(claimedVersion)) {
				const error = new UnsupportedProtocolVersionError({
					supported: [...SUPPORTED_MODERN_PROTOCOL_VERSIONS],
					requested: claimedVersion ?? "unknown"
				});
				reply = {
					jsonrpc: "2.0",
					id: message.id,
					error: {
						code: error.code,
						message: error.message,
						data: error.data
					}
				};
			} else reply = listenRouter.serve(message);
			await wire.send("error" in reply ? reply : {
				jsonrpc: "2.0",
				method: reply.method,
				params: reply.params
			}).catch((error) => reportError(toError(error)));
			return true;
		}
		if (isJSONRPCNotification(message) && message.method === "notifications/cancelled") {
			const cancelledId = message.params?.requestId;
			if (cancelledId !== void 0 && listenRouter.cancel(cancelledId)) return true;
		}
		return false;
	};
	/** Answers a 2025-era request the entry will not serve (the modern-only rejection cells). */
	const answerLegacyRejection = (request, reason, requestedVersion) => {
		const rejection = modernOnlyStrictRejection({
			kind: "legacy",
			reason,
			...requestedVersion !== void 0 && { requestedVersion }
		}, SUPPORTED_MODERN_PROTOCOL_VERSIONS);
		if (rejection === void 0) return Promise.resolve();
		reportError(/* @__PURE__ */ new Error(`Rejected 2025-era request on a modern-only stdio connection (${rejection.cell}): ${rejection.message}`));
		return writeErrorResponse(request.id, rejection.code, rejection.message, rejection.data);
	};
	const onInstanceClosed = (channel) => {
		if (closing || channel === discarding) return;
		closeAll();
	};
	const connectInstance = async (era, revision) => {
		const product = await factory({ era });
		const server = product instanceof McpServer ? product.server : product;
		if (era === "modern") {
			setNegotiatedProtocolVersion(server, revision);
			installModernOnlyHandlers(server, SUPPORTED_MODERN_PROTOCOL_VERSIONS);
			listenRouter.setServerCapabilities(server.getCapabilities(), serverIdentityOf(server));
		}
		const channel = new StdioConnectionChannel(wire, () => onInstanceClosed(channel), era === "modern" ? modernOutboundIntercept : void 0);
		await product.connect(channel);
		return {
			product,
			channel
		};
	};
	/** Closes an instance whose factory resolved only after the connection was torn down. */
	const disposeLateInstance = (instance) => instance.product.close().catch((error) => reportError(toError(error)));
	const discardProbeInstance = async (instance) => {
		discarding = instance.channel;
		try {
			if (!await instance.channel.whenRequestsAnswered(DISCARD_ANSWER_TIMEOUT_MS)) reportError(/* @__PURE__ */ new Error(`Discarded the probe instance with requests still unanswered after ${DISCARD_ANSWER_TIMEOUT_MS}ms; continuing with the fallback`));
			await instance.product.close();
		} catch (error) {
			reportError(toError(error));
		} finally {
			discarding = void 0;
		}
	};
	const processMessage = async (message) => {
		if (state.phase === "closed") return;
		if (state.phase === "pinned") {
			if (state.era === "modern" && isJSONRPCRequest(message) && message.method === "initialize" && !carriesValidModernEnvelopeClaim(message.params)) {
				await answerLegacyRejection(message, "initialize", message.params !== null && typeof message.params === "object" && typeof message.params.protocolVersion === "string" ? message.params.protocolVersion : void 0);
				return;
			}
			if (state.era === "modern" && await tryServeListen(message)) return;
			if (isTornDown()) return;
			state.instance.channel.deliver(message);
			return;
		}
		if (!isJSONRPCRequest(message) && !isJSONRPCNotification(message)) {
			reportError(/* @__PURE__ */ new Error("Discarded a JSON-RPC response received before the connection negotiated an era"));
			return;
		}
		const opening = classifyOpeningMessage(message);
		switch (opening.kind) {
			case "invalid-envelope": {
				const detail = `Invalid _meta envelope for protocol revision 2026-07-28: ${opening.issue.key}: ${opening.issue.problem}`;
				if (isJSONRPCRequest(message)) await writeErrorResponse(message.id, ProtocolErrorCode.InvalidParams, detail, { envelope: opening.issue });
				else reportError(/* @__PURE__ */ new Error(`Discarded a notification with a malformed envelope: ${detail}`));
				return;
			}
			case "unsupported-revision":
				if (isJSONRPCRequest(message)) {
					const error = new UnsupportedProtocolVersionError({
						supported: [...SUPPORTED_MODERN_PROTOCOL_VERSIONS],
						requested: opening.requested
					});
					reportError(error);
					await writeErrorResponse(message.id, error.code, error.message, error.data);
				} else reportError(/* @__PURE__ */ new Error(`Discarded a notification claiming unsupported protocol revision ${opening.requested}`));
				return;
			case "modern":
				if (isJSONRPCRequest(message) && message.method === "server/discover") {
					if (state.phase === "probe") {
						state.instance.channel.deliver(message, { classification: opening.classification });
						return;
					}
					const instance = await connectInstance("modern", opening.revision);
					if (isTornDown()) {
						await disposeLateInstance(instance);
						return;
					}
					state = {
						phase: "probe",
						instance
					};
					instance.channel.deliver(message, { classification: opening.classification });
					return;
				}
				if (state.phase === "probe") {
					if (isJSONRPCNotification(message)) {
						state.instance.channel.deliver(message, { classification: opening.classification });
						return;
					}
					state = {
						phase: "pinned",
						era: "modern",
						instance: state.instance
					};
				} else {
					const instance = await connectInstance("modern", opening.revision);
					if (isTornDown()) {
						await disposeLateInstance(instance);
						return;
					}
					state = {
						phase: "pinned",
						era: "modern",
						instance
					};
				}
				if (await tryServeListen(message)) return;
				if (isTornDown()) return;
				state.instance.channel.deliver(message, { classification: opening.classification });
				return;
			case "legacy": {
				if (legacyMode === "reject") {
					if (isJSONRPCRequest(message)) await answerLegacyRejection(message, opening.reason, opening.requestedVersion);
					return;
				}
				if (state.phase === "probe") {
					await discardProbeInstance(state.instance);
					if (isTornDown()) return;
					state = { phase: "opening" };
				}
				const instance = await connectInstance("legacy");
				if (isTornDown()) {
					await disposeLateInstance(instance);
					return;
				}
				state = {
					phase: "pinned",
					era: "legacy",
					instance
				};
				state.instance.channel.deliver(message);
				return;
			}
		}
	};
	const queue = [];
	let pumping = false;
	const pump = async () => {
		if (pumping) return;
		pumping = true;
		try {
			while (queue.length > 0) {
				const message = queue.shift();
				try {
					await processMessage(message);
				} catch (error) {
					if (isJSONRPCRequest(message)) await writeErrorResponse(message.id, ProtocolErrorCode.InternalError, "Internal server error");
					reportError(toError(error));
				}
			}
		} finally {
			pumping = false;
		}
	};
	const closeAll = async () => {
		if (closing || state.phase === "closed") return;
		closing = true;
		const current = state;
		state = { phase: "closed" };
		for (const result of listenRouter.teardownAll()) await wire.send(result).catch((error) => reportError(toError(error)));
		if (current.phase === "probe" || current.phase === "pinned") await current.instance.product.close().catch((error) => reportError(toError(error)));
		await wire.close().catch((error) => reportError(toError(error)));
	};
	wire.onmessage = (message) => {
		queue.push(message);
		pump();
	};
	wire.onerror = (error) => {
		reportError(error);
		if (state.phase === "probe" || state.phase === "pinned") state.instance.channel.onerror?.(error);
	};
	wire.onclose = () => {
		if (closing || state.phase === "closed") return;
		closing = true;
		const current = state;
		state = { phase: "closed" };
		if (current.phase === "probe" || current.phase === "pinned") current.instance.product.close().catch((error) => reportError(toError(error)));
	};
	const started = wire.start().catch((error) => {
		reportError(toError(error));
		throw error;
	});
	started.catch(() => {});
	return { close: async () => {
		await started.catch(() => {});
		await closeAll();
	} };
}
function toError(value) {
	return value instanceof Error ? value : new Error(String(value));
}
//#endregion
//#region src/config.ts
const APP_NAME = "claude-image-gen";
const VERSION = "0.1.0";
/** Name of the env var AND of the macOS Keychain item (service) holding the OpenAI key. */
const KEY_NAME = "OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN";
function expandHome(p) {
	return p === "~" || p.startsWith("~/") ? path.join(os.homedir(), p.slice(1)) : p;
}
/**
* The library holds every generated image. It defaults to iCloud Drive (so all
* Macs share it) and falls back to ~/Pictures. Override with CLAUDE_IMAGE_GEN_LIBRARY.
*/
function libraryDir() {
	const override = process.env.CLAUDE_IMAGE_GEN_LIBRARY;
	if (override) return path.resolve(expandHome(override));
	const icloud = path.join(os.homedir(), "Library/Mobile Documents/com~apple~CloudDocs");
	if (process.platform === "darwin" && fs.existsSync(icloud)) return path.join(icloud, "Claude Images");
	return path.join(os.homedir(), "Pictures", "Claude Images");
}
const imagesDir = () => path.join(libraryDir(), "images");
const inputsDir = () => path.join(libraryDir(), "inputs");
/** Machine-local scratch space (never synced): preview renders, etc. */
function cacheDir() {
	if (process.env.CLAUDE_IMAGE_GEN_CACHE) {
		fs.mkdirSync(process.env.CLAUDE_IMAGE_GEN_CACHE, { recursive: true });
		return process.env.CLAUDE_IMAGE_GEN_CACHE;
	}
	const base = process.platform === "darwin" ? path.join(os.homedir(), "Library/Caches") : process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
	const dir = path.join(base, APP_NAME);
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}
const DEFAULT_SETTINGS = {
	mainlineModel: "gpt-6-astra",
	imageModel: "gpt-image-2.5-sunburst",
	size: null,
	quality: null,
	outputFormat: null,
	background: null,
	moderation: null,
	openGallery: true,
	galleryPort: 47821
};
/** Settings live inside the library so model choices follow you to every Mac... */
const settingsPath = () => path.join(libraryDir(), "settings.json");
/** ...except these, which are about this machine (a port taken on one Mac says nothing about the others). */
const LOCAL_KEYS = ["galleryPort", "openGallery"];
const isLocalKey = (k) => LOCAL_KEYS.includes(k);
function localSettingsPath() {
	const base = process.env.CLAUDE_IMAGE_GEN_LOCAL_CONFIG || (process.platform === "darwin" ? path.join(os.homedir(), "Library/Application Support", "claude-image-gen") : path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "claude-image-gen"));
	return path.join(base, "local.json");
}
function loadLocalSettings() {
	const file = localSettingsPath();
	try {
		return JSON.parse(fs.readFileSync(file, "utf8"));
	} catch (e) {
		if (e?.code === "ENOENT") return {};
		throw new Error(`${file} is unreadable or not valid JSON. Fix or delete it; nothing was changed.`);
	}
}
/**
* Only a missing file means "no settings yet". Anything else (unreadable,
* half-synced, invalid JSON) is an error: silently falling back to defaults
* would generate with the wrong models, and the next save would overwrite the
* user's real settings with those defaults.
*/
function loadSettings() {
	const file = settingsPath();
	let text;
	try {
		text = fs.readFileSync(file, "utf8");
	} catch (e) {
		if (e?.code !== "ENOENT") throw explainFsError(e, file);
		const placeholder = path.join(path.dirname(file), `.${path.basename(file)}.icloud`);
		if (!fs.existsSync(placeholder)) return { ...DEFAULT_SETTINGS };
		text = downloadFromICloudSync(file);
	}
	let shared;
	try {
		shared = JSON.parse(text);
	} catch {
		throw new Error(`${file} is not valid JSON (perhaps a half-synced iCloud copy). Fix or delete it; nothing was changed.`);
	}
	return {
		...DEFAULT_SETTINGS,
		...shared,
		...loadLocalSettings()
	};
}
/** Older macOS versions offload files as ".name.icloud" placeholders; fetch one synchronously. */
function downloadFromICloudSync(file, timeoutMs = 3e4) {
	try {
		execFileSync("brctl", ["download", file], { stdio: "ignore" });
	} catch {}
	const deadline = Date.now() + timeoutMs;
	while (!fs.existsSync(file)) {
		if (Date.now() > deadline) throw new Error(`Timed out waiting for iCloud to download ${file}.`);
		Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
	}
	return fs.readFileSync(file, "utf8");
}
function saveSettings(patch) {
	const current = loadSettings();
	const local = {};
	const shared = {};
	for (const [k, v] of Object.entries(patch)) (isLocalKey(k) ? local : shared)[k] = v;
	if (Object.keys(shared).length) {
		const next = {
			...current,
			...shared
		};
		for (const k of LOCAL_KEYS) delete next[k];
		writeFileAtomic(settingsPath(), JSON.stringify(next, null, 2) + "\n");
	}
	if (Object.keys(local).length) writeFileAtomic(localSettingsPath(), JSON.stringify({
		...loadLocalSettings(),
		...local
	}, null, 2) + "\n");
	return {
		...current,
		...patch
	};
}
/**
* macOS privacy controls (TCC) can block the app running Claude Code from iCloud Drive; the
* raw EPERM says nothing about how to fix that.
*/
function explainFsError(e, file) {
	if ((e?.code === "EPERM" || e?.code === "EACCES") && file.includes("/Library/Mobile Documents/")) return /* @__PURE__ */ new Error(`macOS blocked access to iCloud Drive (${file}). Allow the app that runs Claude Code (Terminal, iTerm, VS Code, ...) in System Settings > Privacy & Security > Files & Folders (iCloud Drive) or Full Disk Access, then restart it. Or set CLAUDE_IMAGE_GEN_LIBRARY to a folder outside iCloud Drive.`);
	return e instanceof Error ? e : new Error(String(e));
}
/** Write via temp file + rename so iCloud never syncs a half-written file. */
function writeFileAtomic(file, data) {
	try {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
		fs.writeFileSync(tmp, data);
		fs.renameSync(tmp, file);
	} catch (e) {
		throw explainFsError(e, file);
	}
}
let cachedKey;
/** Env var first, then the macOS Keychain item of the same name. */
function getApiKey() {
	if (cachedKey) return cachedKey;
	const fromEnv = process.env[KEY_NAME]?.trim();
	if (fromEnv) return cachedKey = fromEnv;
	if (process.platform === "darwin") try {
		const fromKeychain = execFileSync("security", [
			"find-generic-password",
			"-s",
			KEY_NAME,
			"-w"
		], {
			encoding: "utf8",
			stdio: [
				"ignore",
				"pipe",
				"ignore"
			]
		}).trim();
		if (fromKeychain) return cachedKey = fromKeychain;
	} catch {}
	throw new Error(`No OpenAI API key found. Set the env var ${KEY_NAME}` + (process.platform === "darwin" ? ` or store it in the Keychain (copy the key first): security add-generic-password -U -a "$USER" -s ${KEY_NAME} -w "$(pbpaste)"` : "") + ".");
}
function clearCachedKey() {
	cachedKey = void 0;
}
/** The user's project (Claude Code's working dir). Relative paths resolve against it. */
function projectDir() {
	const fromEnv = process.env.CLAUDE_PROJECT_DIR;
	return fromEnv && !fromEnv.includes("${") ? fromEnv : process.cwd();
}
//#endregion
//#region src/library.ts
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const ID_RE = /^[a-z2-9]{4}$/;
function isImageId(s) {
	return ID_RE.test(s) && /[a-z]/.test(s) && /[2-9]/.test(s);
}
function randomId() {
	for (;;) {
		let id = "";
		for (let i = 0; i < 4; i++) id += ALPHABET[randomInt(31)];
		if (isImageId(id)) return id;
	}
}
function randomToken(len = 6) {
	let s = "";
	for (let i = 0; i < len; i++) s += ALPHABET[randomInt(31)];
	return s;
}
const NAME_RE = /^(\d{4}-\d{2}-\d{2})-([a-z2-9]{4})(?:-[^.]*)?\.([a-z0-9]+)$/;
/** iCloud replaces offloaded files with ".<name>.icloud" placeholders. */
function realName(entry) {
	return entry.startsWith(".") && entry.endsWith(".icloud") ? entry.slice(1, -7) : entry;
}
let cachedIndex;
/**
* The images/ listing, re-read only when the directory's mtime changes (adding,
* removing or renaming a file updates it; editing a sidecar in place doesn't
* need to). Saves a full readdir per lookup: the gallery resolves every tile by id.
*/
function dirIndex() {
	const dir = imagesDir();
	let mtimeMs;
	let entries;
	try {
		mtimeMs = fs.statSync(dir).mtimeMs;
		if (cachedIndex?.dir === dir && cachedIndex.mtimeMs === mtimeMs) return cachedIndex;
		entries = fs.readdirSync(dir);
	} catch (e) {
		if (e?.code === "ENOENT") return {
			dir,
			mtimeMs: -1,
			entries: [],
			sidecars: /* @__PURE__ */ new Map()
		};
		throw explainFsError(e, dir);
	}
	const sidecars = /* @__PURE__ */ new Map();
	for (const e of entries) {
		const name = realName(e);
		const m = NAME_RE.exec(name);
		if (m && m[3] === "json") sidecars.set(m[2], [...sidecars.get(m[2]) ?? [], name]);
	}
	return cachedIndex = {
		dir,
		mtimeMs,
		entries,
		sidecars
	};
}
function listEntries() {
	return dirIndex().entries.map(realName);
}
const reserved = /* @__PURE__ */ new Set();
/** IDs already on disk or handed out by this process but not yet written. */
function newIds(count) {
	const taken = new Set(listEntries().map((e) => NAME_RE.exec(e)?.[2]).filter(Boolean));
	const out = [];
	while (out.length < count) {
		const id = randomId();
		if (taken.has(id) || reserved.has(id)) continue;
		reserved.add(id);
		out.push(id);
	}
	return out;
}
function slugify(text, maxWords = 6) {
	return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean).slice(0, maxWords).join("-").slice(0, 48).replace(/-+$/, "") || "image";
}
/** The date is local (an image made at 00:30 in Berlin belongs to that day, not the previous UTC one). */
function baseName(id, prompt, date = /* @__PURE__ */ new Date()) {
	const pad = (n) => String(n).padStart(2, "0");
	return `${`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`}-${id}-${slugify(prompt)}`;
}
/**
* Make sure an iCloud file is actually on disk. If it was offloaded ("Optimise
* Mac Storage"), ask iCloud to download it and wait.
*/
async function ensureLocal(file, timeoutMs = 9e4) {
	if (fs.existsSync(file)) return;
	const placeholder = path.join(path.dirname(file), `.${path.basename(file)}.icloud`);
	if (!fs.existsSync(placeholder)) throw Object.assign(/* @__PURE__ */ new Error(`File not found: ${file}`), { code: "ENOENT" });
	await new Promise((resolve) => execFile("brctl", ["download", file], () => resolve()));
	const start = Date.now();
	while (!fs.existsSync(file)) {
		if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for iCloud to download ${file}`);
		await new Promise((r) => setTimeout(r, 500));
	}
}
const recordCache = /* @__PURE__ */ new Map();
function readRecordSync(jsonName) {
	const file = path.join(imagesDir(), jsonName);
	try {
		const { mtimeMs } = fs.statSync(file);
		const hit = recordCache.get(jsonName);
		if (hit && hit.mtimeMs === mtimeMs) return hit.record;
		const record = JSON.parse(fs.readFileSync(file, "utf8"));
		recordCache.set(jsonName, {
			mtimeMs,
			record
		});
		return record;
	} catch {
		return;
	}
}
const downloadRequested = /* @__PURE__ */ new Set();
/** Ask iCloud for an offloaded file once per process (the feed reloads often; brctl is a process spawn). */
function requestDownload(file) {
	if (downloadRequested.has(file)) return;
	downloadRequested.add(file);
	execFile("brctl", ["download", file], () => {});
}
/** All records, newest first. Sidecars that iCloud offloaded are requested and skipped this time. */
function allRecords() {
	const out = [];
	for (const entry of dirIndex().entries) {
		if (entry.endsWith(".json.icloud")) {
			requestDownload(path.join(imagesDir(), realName(entry)));
			continue;
		}
		if (!entry.endsWith(".json") || entry.startsWith(".")) continue;
		const r = readRecordSync(entry);
		if (r) out.push(r);
	}
	return out.sort((a, b) => a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.batchIndex - b.batchIndex);
}
function jsonNameFor(id) {
	const names = dirIndex().sidecars.get(id);
	if (names && names.length > 1) throw new Error(`Image id "${id}" exists more than once: ${names.join(", ")}. Rename one of the files (both .json and image) to a new id.`);
	return names?.[0];
}
async function getRecord(id) {
	const name = jsonNameFor(id);
	if (!name) return void 0;
	await ensureLocal(path.join(imagesDir(), name));
	return readRecordSync(name);
}
function imagePath(record) {
	return path.join(imagesDir(), record.file);
}
function saveRecord(record) {
	const json = record.file.replace(/\.[a-z0-9]+$/, ".json");
	writeFileAtomic(path.join(imagesDir(), json), JSON.stringify(record, null, 2) + "\n");
}
async function updateRecord(id, patch) {
	const r = await getRecord(id);
	if (!r) throw new Error(`Unknown image id "${id}"`);
	patch(r);
	saveRecord(r);
	return r;
}
function childrenOf(id) {
	return allRecords().filter((r) => r.parent === id);
}
/** Batches generated by this process, most recent last. Backs "last". */
const sessionBatches = [];
function rememberBatch(ids) {
	if (ids.length) sessionBatches.push(ids);
}
/**
* Resolve "last" (or an id) to exactly one record. "last" prefers this
* session's most recent batch and falls back to the newest image in the library.
*/
async function resolveOne(ref) {
	const key = ref.trim().replace(/^#|^img:/, "").toLowerCase();
	if (key === "last") {
		const batch = sessionBatches.at(-1);
		if (batch && batch.length > 1) throw new Error(`"last" is ambiguous: the last batch has ${batch.length} images (${batch.join(", ")}). Pick one.`);
		let id = batch?.[0];
		if (!id) {
			const all = allRecords();
			const newest = all[0];
			if (!newest) throw new Error("The library is empty, so there is no last image yet.");
			const siblings = all.filter((r) => r.batch === newest.batch).map((r) => r.id);
			if (siblings.length > 1) throw new Error(`"last" is ambiguous: the newest batch has ${siblings.length} images (${siblings.join(", ")}). Pick one.`);
			id = newest.id;
		}
		const r = await getRecord(id);
		if (!r) throw new Error(`Image ${id} is missing from the library.`);
		return r;
	}
	if (!isImageId(key)) throw new Error(`"${ref}" is not an image id (ids look like k7f2).`);
	const r = await getRecord(key);
	if (!r) throw new Error(`No image with id "${key}" in the library.`);
	return r;
}
function newRecordBase() {
	return {
		machine: os.hostname(),
		cwd: projectDir()
	};
}
//#endregion
//#region src/images.ts
const run$1 = promisify(execFile);
const isMac = process.platform === "darwin";
const MIME = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	gif: "image/gif"
};
/** Formats OpenAI doesn't take directly but sips can convert. */
const CONVERTIBLE = /* @__PURE__ */ new Set([
	"heic",
	"heif",
	"tif",
	"tiff",
	"bmp",
	"avif"
]);
function extOf(file) {
	return path.extname(file).slice(1).toLowerCase();
}
function isSupportedInput(file) {
	const ext = extOf(file);
	return ext in MIME || isMac && CONVERTIBLE.has(ext);
}
function tmpFile(ext) {
	return path.join(cacheDir(), `tmp-${process.pid}-${randomToken(8)}.${ext}`);
}
async function withTmp(ext, fn) {
	const tmp = tmpFile(ext);
	try {
		return await fn(tmp);
	} finally {
		fs.rmSync(tmp, { force: true });
	}
}
/** Returns bytes + ext usable as an OpenAI input image (converting HEIC etc. to PNG). */
async function toUploadable(file) {
	const ext = extOf(file);
	if (ext in MIME) return {
		data: fs.readFileSync(file),
		ext
	};
	if (isMac && CONVERTIBLE.has(ext)) return withTmp("png", async (tmp) => {
		await run$1("sips", [
			"-s",
			"format",
			"png",
			file,
			"--out",
			tmp
		]);
		return {
			data: fs.readFileSync(tmp),
			ext: "png"
		};
	});
	throw new Error(`Unsupported image format ".${ext}" (${file}). Use png, jpeg, webp or gif.`);
}
async function dimensions(file) {
	if (isMac) try {
		const { stdout } = await run$1("sips", [
			"-g",
			"pixelWidth",
			"-g",
			"pixelHeight",
			file
		]);
		const w = /pixelWidth: (\d+)/.exec(stdout)?.[1];
		const h = /pixelHeight: (\d+)/.exec(stdout)?.[1];
		if (w && h) return {
			width: +w,
			height: +h
		};
	} catch {}
	const buf = fs.readFileSync(file);
	if (buf.subarray(1, 4).toString() === "PNG") return {
		width: buf.readUInt32BE(16),
		height: buf.readUInt32BE(20)
	};
}
/**
* A downscaled render for Claude to look at. JPEG keeps it small; PNG is used
* when the image may have transparency, so a transparent logo doesn't turn
* into a black square.
*/
async function preview(file, maxEdge, keepAlpha) {
	if (!isMac) return {
		data: fs.readFileSync(file).toString("base64"),
		mimeType: MIME[extOf(file)] ?? "image/png"
	};
	const fmt = keepAlpha ? "png" : "jpeg";
	return withTmp(fmt, async (tmp) => {
		const src = await dimensions(file);
		const args = [
			...!src || Math.max(src.width, src.height) > maxEdge ? ["-Z", String(maxEdge)] : [],
			"-s",
			"format",
			fmt
		];
		if (fmt === "jpeg") args.push("-s", "formatOptions", "85");
		await run$1("sips", [
			...args,
			file,
			"--out",
			tmp
		]);
		const dims = await dimensions(tmp);
		return {
			data: fs.readFileSync(tmp).toString("base64"),
			mimeType: MIME[fmt],
			...dims
		};
	});
}
/** [x, y, w, h] as fractions of the image. */
const REGIONS = {
	full: [
		0,
		0,
		1,
		1
	],
	"top-left": [
		0,
		0,
		.5,
		.5
	],
	"top-right": [
		.5,
		0,
		.5,
		.5
	],
	"bottom-left": [
		0,
		.5,
		.5,
		.5
	],
	"bottom-right": [
		.5,
		.5,
		.5,
		.5
	],
	top: [
		0,
		0,
		1,
		.5
	],
	bottom: [
		0,
		.5,
		1,
		.5
	],
	left: [
		0,
		0,
		.5,
		1
	],
	right: [
		.5,
		0,
		.5,
		1
	],
	center: [
		.25,
		.25,
		.5,
		.5
	]
};
/**
* Crop a region at native resolution, then cap the long edge. Claude's vision
* input is downscaled to roughly 1.15 MP anyway, so zooming via crops is how
* fine detail (text, hands, edges) actually becomes visible.
*/
async function crop(file, region, maxEdge, keepAlpha) {
	const dims = await dimensions(file);
	if (!dims) throw new Error("Could not read image dimensions.");
	const [fx, fy, fw, fh] = Array.isArray(region) ? region : REGIONS[region];
	const clamp = (v) => Math.min(1, Math.max(0, v));
	const x = Math.round(clamp(fx) * dims.width);
	const y = Math.round(clamp(fy) * dims.height);
	const w = Math.max(1, Math.min(dims.width - x, Math.round(clamp(fw) * dims.width)));
	const h = Math.max(1, Math.min(dims.height - y, Math.round(clamp(fh) * dims.height)));
	const box = {
		x,
		y,
		w,
		h
	};
	if (!isMac) return {
		...await preview(file, maxEdge, keepAlpha),
		box: {
			x: 0,
			y: 0,
			w: dims.width,
			h: dims.height
		},
		image: dims
	};
	return withTmp("png", async (cropped) => {
		await run$1("sips", [
			"-c",
			String(h),
			String(w),
			"--cropOffset",
			String(y),
			String(x),
			file,
			"--out",
			cropped
		]);
		return {
			...await preview(cropped, Math.min(maxEdge, Math.max(w, h)), keepAlpha),
			box,
			image: dims
		};
	});
}
//#endregion
//#region src/openai.ts
const BASE = process.env.CLAUDE_IMAGE_GEN_API_BASE || "https://api.openai.com/v1";
var OpenAIError = class extends Error {
	status;
	code;
	details;
	constructor(status, code, message, details) {
		super(message);
		this.status = status;
		this.code = code;
		this.details = details;
	}
	/** previous_response_id no longer usable (expired, deleted, or store=false). */
	get isMissingPrevious() {
		return this.code === "previous_response_not_found" || (this.status === 400 || this.status === 404) && /previous[_ ]response/i.test(this.message);
	}
};
async function request(method, path, body, timeoutMs = 3e5) {
	for (let attempt = 0;; attempt++) {
		const res = await fetch(BASE + path, {
			method,
			headers: {
				Authorization: `Bearer ${getApiKey()}`,
				"Content-Type": "application/json"
			},
			body: body === void 0 ? void 0 : JSON.stringify(body),
			signal: AbortSignal.timeout(timeoutMs)
		});
		const json = await res.json().catch(() => void 0);
		if (res.ok) return json;
		const err = json?.error ?? {};
		if ((res.status === 429 || res.status >= 500) && attempt < 2 && err.code !== "insufficient_quota") {
			const wait = Number(res.headers.get("retry-after")) * 1e3 || 2e3 * (attempt + 1) ** 2;
			await new Promise((r) => setTimeout(r, wait));
			continue;
		}
		if (res.status === 401) clearCachedKey();
		let message = err.message || `OpenAI request failed with HTTP ${res.status}`;
		if (err.code === "moderation_blocked") {
			const d = err.moderation_details;
			message = `Blocked by OpenAI moderation${d?.moderation_stage ? ` (${d.moderation_stage} stage)` : ""}${d?.categories?.length ? `: ${d.categories.join(", ")}` : ""}.`;
		}
		throw new OpenAIError(res.status, err.code, message, err);
	}
}
const createResponse = (body) => request("POST", "/responses", body);
async function listModels() {
	return (await request("GET", "/models", void 0, 3e4)).data.map((m) => m.id).sort();
}
//#endregion
//#region src/refs.ts
const PASTE_RE = /^(?:paste:|\[?image\s*#?)(\d+)\]?$/i;
function dataUrl(data, ext) {
	return `data:${MIME[ext] ?? "image/png"};base64,${data.toString("base64")}`;
}
/** Content-addressed copy in inputs/, so references survive temp files and dead URLs. */
function storeInput(data, ext) {
	const name = `${createHash("sha256").update(data).digest("hex").slice(0, 16)}.${ext}`;
	const file = path.join(inputsDir(), name);
	if (!fs.existsSync(file)) writeFileAtomic(file, data);
	return name;
}
async function resolveRef(ref) {
	const raw = ref.trim();
	const key = raw.replace(/^#|^img:/, "").toLowerCase();
	if (key === "last" || isImageId(key)) {
		const r = await resolveOne(key);
		const file = imagePath(r);
		await ensureLocal(file);
		const { data, ext } = await toUploadable(file);
		return {
			record: {
				kind: "library",
				source: raw,
				stored: r.id
			},
			dataUrl: dataUrl(data, ext)
		};
	}
	const paste = PASTE_RE.exec(raw);
	if (paste) {
		const { data, ext, origin } = await pastedImage(Number(paste[1]));
		return {
			record: {
				kind: "paste",
				source: `paste:${paste[1]}`,
				origin,
				stored: storeInput(data, ext)
			},
			dataUrl: dataUrl(data, ext)
		};
	}
	if (/^https?:\/\//i.test(raw)) {
		const res = await fetch(raw, { signal: AbortSignal.timeout(3e4) });
		if (!res.ok) throw new Error(`Could not download ${raw}: HTTP ${res.status}`);
		const type = res.headers.get("content-type")?.split(";")[0] ?? "";
		const ext = Object.entries(MIME).find(([, m]) => m === type)?.[0];
		if (!ext) throw new Error(`${raw} is not a png/jpeg/webp/gif image (content-type: ${type || "unknown"}).`);
		const data = await readCapped(res, raw);
		return {
			record: {
				kind: "url",
				source: raw,
				stored: storeInput(data, ext)
			},
			dataUrl: dataUrl(data, ext)
		};
	}
	const file = path.resolve(projectDir(), expandHome(raw.replace(/^file:\/\//, "")));
	if (!fs.existsSync(file)) throw new Error(`Reference not found: ${raw} (looked for ${file})`);
	if (!isSupportedInput(file)) throw new Error(`Unsupported reference image type: ${file}`);
	const { data, ext } = await toUploadable(file);
	return {
		record: {
			kind: "file",
			source: file,
			stored: storeInput(data, ext)
		},
		dataUrl: dataUrl(data, ext)
	};
}
const MAX_DOWNLOAD = 50 << 20;
/** Read a response body, refusing more than MAX_DOWNLOAD bytes whether or not Content-Length is honest. */
async function readCapped(res, url) {
	const tooBig = () => /* @__PURE__ */ new Error(`${url} is larger than 50 MB.`);
	if (Number(res.headers.get("content-length")) > MAX_DOWNLOAD) throw tooBig();
	const chunks = [];
	let total = 0;
	for await (const chunk of res.body) {
		total += chunk.length;
		if (total > MAX_DOWNLOAD) throw tooBig();
		chunks.push(Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}
/**
* Images pasted into Claude Code are never written to disk on their own; they
* live as base64 blocks in the session transcript. We take the Nth image of the
* most recent user message that has images.
*
* Which transcript: Claude Code exposes CLAUDE_CODE_SESSION_ID to processes it
* starts, and the transcript is named after it. Without it we fall back to the
* project's recently active transcripts, and refuse to guess when more than one
* session pasted images recently (two sessions open in the same project).
*/
async function pastedImage(n) {
	const projectsDir = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "projects");
	const dir = path.join(projectsDir, projectDir().replace(/[^a-zA-Z0-9]/g, "-"));
	let found;
	const sessionId = process.env.CLAUDE_CODE_SESSION_ID;
	const sessionFile = sessionId ? findSessionTranscript(projectsDir, dir, sessionId) : void 0;
	if (sessionFile) {
		found = await lastUserImages(sessionFile);
		if (!found) throw new Error("No pasted images found in this session. Ask the user to paste the image again or give a file path.");
	} else {
		const recent = listTranscripts(dir).filter((f) => Date.now() - f.mtime < 18e5);
		const hits = (await Promise.all(recent.map((f) => lastUserImages(f.file)))).filter((h) => !!h);
		hits.sort((a, b) => a.timestamp < b.timestamp ? 1 : -1);
		if (hits.filter((h) => Date.now() - Date.parse(h.timestamp) < 6e5).length > 1) throw new Error("Several Claude sessions in this project pasted images in the last 10 minutes, so it's unclear which paste is meant. Ask the user for a file path instead (dragging the file into the terminal inserts it).");
		found = hits[0];
	}
	if (!found) throw new Error(`Could not find pasted image #${n} in this session's transcript (${dir}). Ask the user to drag the file in (which inserts its path) or give a file path instead.`);
	const img = found.images[n - 1];
	if (!img) throw new Error(`The last message with images has ${found.images.length} image(s); there is no image #${n}.`);
	const ext = Object.entries(MIME).find(([, m]) => m === img.mediaType)?.[0] ?? "png";
	const origin = `pasted ${found.timestamp.slice(0, 16).replace("T", " ")} UTC in session ${path.basename(found.file, ".jsonl").slice(0, 8)}${sessionFile ? "" : ", matched by recency"}`;
	return {
		data: Buffer.from(img.data, "base64"),
		ext,
		origin
	};
}
function listTranscripts(dir) {
	try {
		return fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => ({
			file: path.join(dir, f),
			mtime: fs.statSync(path.join(dir, f)).mtimeMs
		})).sort((a, b) => b.mtime - a.mtime);
	} catch {
		return [];
	}
}
/** The session's transcript, usually in this project's folder; otherwise search all projects (e.g. cwd mismatch). */
function findSessionTranscript(projectsDir, dir, sessionId) {
	const name = `${sessionId}.jsonl`;
	if (fs.existsSync(path.join(dir, name))) return path.join(dir, name);
	try {
		for (const d of fs.readdirSync(projectsDir)) {
			const candidate = path.join(projectsDir, d, name);
			if (fs.existsSync(candidate)) return candidate;
		}
	} catch {}
}
const CHUNK = 4 << 20;
const MAX_SCAN = 256 << 20;
const MAX_LINE = 128 << 20;
/**
* Scan a JSONL transcript backwards in fixed-size async chunks (transcripts can
* be gigabytes; this keeps memory bounded and doesn't block the gallery server).
* Only top-level image blocks of user messages count: images inside tool_result
* blocks are tool output (e.g. screenshots Claude looked at), not pastes.
*/
async function lastUserImages(file) {
	const fh = await fs.promises.open(file, "r");
	try {
		let pos = (await fh.stat()).size;
		let carry = Buffer.alloc(0);
		let scanned = 0;
		while (pos > 0 && scanned < MAX_SCAN) {
			const len = Math.min(CHUNK, pos);
			pos -= len;
			scanned += len;
			const chunk = Buffer.alloc(len);
			await fh.read(chunk, 0, len, pos);
			const buf = Buffer.concat([chunk, carry]);
			let end = buf.length;
			while (end > 0) {
				const nl = buf.lastIndexOf(10, end - 1);
				if (nl < 0) break;
				const hit = parseLine(buf.subarray(nl + 1, end), file);
				if (hit) return hit;
				end = nl;
			}
			carry = Buffer.from(buf.subarray(0, end));
			if (carry.length > MAX_LINE) return void 0;
		}
		return pos === 0 ? parseLine(carry, file) : void 0;
	} finally {
		await fh.close();
	}
}
function parseLine(line, file) {
	if (!line.length || !line.includes("\"image\"") || !line.includes("\"user\"")) return void 0;
	try {
		const entry = JSON.parse(line.toString("utf8"));
		if (entry.type !== "user" || !Array.isArray(entry.message?.content)) return void 0;
		const images = entry.message.content.filter((b) => b?.type === "image" && b.source?.type === "base64").map((b) => ({
			mediaType: b.source.media_type,
			data: b.source.data
		}));
		return images.length ? {
			file,
			images,
			timestamp: entry.timestamp ?? ""
		} : void 0;
	} catch {
		return;
	}
}
//#endregion
//#region src/gallery/page.ts
const PAGE_HTML = "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>Claude Images</title>\n<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23c2613a'/%3E%3Ccircle cx='11' cy='12' r='4' fill='%23fff'/%3E%3Cpath d='M4 26l8-8 5 5 4-4 7 7z' fill='%23fff'/%3E%3C/svg%3E\">\n<style>\n  :root {\n    --bg: #f6f5f2; --surface: #ffffff; --surface-2: #efede8; --text: #1d1c1a; --muted: #6f6b64;\n    --line: #e2dfd8; --accent: #c2613a; --accent-soft: #c2613a22; --danger: #b3261e; --star: #d99a00;\n    --radius: 12px; --shadow: 0 1px 2px #0000000d, 0 4px 16px #0000000a;\n  }\n  @media (prefers-color-scheme: dark) {\n    :root {\n      --bg: #141413; --surface: #1d1d1b; --surface-2: #262624; --text: #ecebe7; --muted: #9b978f;\n      --line: #2f2e2b; --accent: #e07b52; --accent-soft: #e07b5226; --danger: #f2827a; --star: #f5c04a;\n      --shadow: 0 1px 2px #00000040, 0 4px 16px #00000033;\n    }\n  }\n  * { box-sizing: border-box; }\n  [hidden] { display: none !important; }\n  html, body { margin: 0; background: var(--bg); color: var(--text); }\n  body { font: 14px/1.45 ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif; }\n  button { font: inherit; color: inherit; }\n  code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }\n\n  header {\n    position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 12px;\n    padding: 12px 24px; background: color-mix(in srgb, var(--bg) 88%, transparent);\n    backdrop-filter: blur(12px); border-bottom: 1px solid var(--line);\n  }\n  header h1 { font-size: 15px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; white-space: nowrap; }\n  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }\n  .dot.live { background: #3fa45b; box-shadow: 0 0 0 3px #3fa45b33; }\n  .spacer { flex: 1; }\n  input[type=search] {\n    width: min(320px, 40vw); padding: 7px 12px; border-radius: 999px; border: 1px solid var(--line);\n    background: var(--surface); color: var(--text); outline: none;\n  }\n  input[type=search]:focus { border-color: var(--accent); }\n  .toggle { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; white-space: nowrap; }\n  .toggle[aria-pressed=true] { border-color: var(--star); color: var(--star); }\n\n  main { max-width: 1400px; margin: 0 auto; padding: 24px; }\n  .empty { color: var(--muted); text-align: center; padding: 80px 0; }\n\n  .batch { margin-bottom: 36px; scroll-margin-top: 80px; }\n  .batch.focus .grid { outline: 2px solid var(--accent); outline-offset: 8px; border-radius: var(--radius); }\n  .batch-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin-bottom: 10px; }\n  .prompt { font-size: 15px; font-weight: 500; max-width: 900px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }\n  .meta { color: var(--muted); font-size: 12.5px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }\n  .chip {\n    display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--line);\n    background: var(--surface); cursor: pointer; font-size: 12px; color: var(--text);\n  }\n  .chip:hover { border-color: var(--accent); }\n\n  .grid { display: grid; gap: 12px; grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr)); }\n  @media (max-width: 900px) { .grid { --cols: 2 !important; } }\n  @media (max-width: 520px) { .grid { --cols: 1 !important; } main, header { padding-left: 16px; padding-right: 16px; } }\n\n  .tile {\n    position: relative; border-radius: var(--radius); overflow: hidden; background: var(--surface-2);\n    box-shadow: var(--shadow); aspect-ratio: var(--ar, 1); cursor: zoom-in;\n  }\n  .tile img { width: 100%; height: 100%; object-fit: contain; display: block; opacity: 0; transition: opacity .35s; }\n  .tile img.loaded { opacity: 1; }\n  .tile.checker { background-color: var(--surface-2); background-image:\n    linear-gradient(45deg, #8881 25%, transparent 25%), linear-gradient(-45deg, #8881 25%, transparent 25%),\n    linear-gradient(45deg, transparent 75%, #8881 75%), linear-gradient(-45deg, transparent 75%, #8881 75%);\n    background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0; }\n  .tile.pending { cursor: default; }\n  .tile.pending::before {\n    content: \"\"; position: absolute; inset: 0;\n    background: linear-gradient(100deg, transparent 20%, color-mix(in srgb, var(--accent) 14%, transparent) 50%, transparent 80%);\n    background-size: 220% 100%; animation: shimmer 1.6s linear infinite;\n  }\n  @keyframes shimmer { from { background-position: 120% 0; } to { background-position: -120% 0; } }\n  .tile .center { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; padding: 16px; color: var(--muted); }\n  .tile.error { cursor: default; aspect-ratio: auto; min-height: 180px; }\n  .tile.error .center { color: var(--danger); font-size: 12.5px; }\n  .overlay {\n    position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; align-items: center;\n    padding: 8px; background: linear-gradient(transparent, #0000008c); opacity: 0; transition: opacity .15s;\n  }\n  .tile:hover .overlay, .tile .overlay.show { opacity: 1; }\n  .idtag {\n    font: 600 12.5px ui-monospace, Menlo, monospace; color: #fff; background: #0000008c; padding: 3px 8px; border-radius: 999px;\n    border: 0; cursor: copy;\n  }\n  .star { border: 0; background: #0000008c; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 15px; line-height: 1; }\n  .star.on { color: var(--star); }\n  .tile .badge-star { position: absolute; top: 8px; right: 8px; color: var(--star); text-shadow: 0 1px 3px #0008; }\n  .more { display: block; margin: 0 auto; }\n\n  dialog {\n    width: min(1500px, 96vw); height: min(940px, 92vh); padding: 0; border: 1px solid var(--line); border-radius: 16px;\n    background: var(--surface); color: var(--text); box-shadow: 0 20px 60px #0006;\n  }\n  dialog::backdrop { background: #000b; }\n  .detail { display: grid; grid-template-columns: minmax(0, 1fr) 360px; height: 100%; }\n  @media (max-width: 900px) { .detail { grid-template-columns: 1fr; grid-template-rows: 55% 45%; } }\n  .stage { position: relative; display: grid; place-items: center; background: var(--surface-2); min-height: 0; }\n  .stage img { max-width: 100%; max-height: 100%; object-fit: contain; }\n  .nav { position: absolute; top: 50%; transform: translateY(-50%); border: 0; background: #0007; color: #fff; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 18px; }\n  .nav.prev { left: 12px; } .nav.next { right: 12px; }\n  aside { overflow-y: auto; padding: 20px; border-left: 1px solid var(--line); display: flex; flex-direction: column; gap: 16px; }\n  aside h2 { margin: 0; font: 600 20px ui-monospace, Menlo, monospace; display: flex; align-items: center; gap: 10px; }\n  aside h3 { margin: 0 0 4px; font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); font-weight: 600; }\n  aside p { margin: 0; white-space: pre-wrap; word-break: break-word; }\n  .kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 13px; }\n  .kv dt { color: var(--muted); } .kv dd { margin: 0; word-break: break-all; }\n  .chips { display: flex; flex-wrap: wrap; gap: 6px; }\n  .refs { display: flex; gap: 6px; flex-wrap: wrap; }\n  .refs img { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid var(--line); cursor: pointer; }\n  .close { position: absolute; top: 12px; right: 12px; z-index: 2; border: 0; background: #0007; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px; }\n  .btn { font: 500 13px/1.3 ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); cursor: pointer; }\n  .btn:hover { border-color: var(--accent); }\n  .toast {\n    position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%) translateY(20px); opacity: 0; transition: all .2s;\n    background: var(--text); color: var(--bg); padding: 8px 14px; border-radius: 999px; pointer-events: none; z-index: 100;\n  }\n  .toast.show { opacity: 1; transform: translateX(-50%); }\n</style>\n</head>\n<body>\n<header>\n  <h1><span class=\"dot\" id=\"dot\" title=\"Live connection\"></span>Claude Images</h1>\n  <div class=\"spacer\"></div>\n  <input type=\"search\" id=\"q\" placeholder=\"Search prompts or ids\" autocomplete=\"off\">\n  <button class=\"toggle\" id=\"starred\" aria-pressed=\"false\">★ Starred</button>\n</header>\n<main>\n  <div id=\"feed\"></div>\n  <div class=\"empty\" id=\"empty\" hidden>No images yet. Ask Claude for one: <code>/img:new a lighthouse at dusk</code></div>\n  <button class=\"toggle more\" id=\"more\" hidden>Load more</button>\n</main>\n<dialog id=\"dlg\"></dialog>\n<div class=\"toast\" id=\"toast\"></div>\n\n<script>\n(() => {\n  const LOADED_AT = Date.now();\n  const params = new URLSearchParams(location.search);\n  // Only tabs the plugin opened (auto=1) may close themselves; never a tab the user opened.\n  const AUTO_OPENED = params.get(\"auto\") === \"1\";\n  const state = { q: \"\", starred: false, batches: [], more: false, focus: params.get(\"batch\"), unseen: 0, detail: null };\n  const $ = (id) => document.getElementById(id);\n  const el = (tag, attrs = {}, ...kids) => {\n    const n = document.createElement(tag);\n    for (const [k, v] of Object.entries(attrs)) {\n      if (v == null || v === false) continue;\n      if (k.startsWith(\"on\")) n.addEventListener(k.slice(2), v);\n      else if (k === \"style\") n.style.cssText = v;\n      else n.setAttribute(k, v === true ? \"\" : v);\n    }\n    for (const k of kids.flat()) if (k != null) n.append(k);\n    return n;\n  };\n  const toast = (msg) => { const t = $(\"toast\"); t.textContent = msg; t.classList.add(\"show\"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove(\"show\"), 1400); };\n  const copy = (text, label) => navigator.clipboard.writeText(text).then(() => toast(label || (\"Copied \" + text)));\n  const ago = (iso) => {\n    const s = (Date.now() - Date.parse(iso)) / 1000;\n    if (s < 60) return \"just now\";\n    if (s < 3600) return Math.floor(s / 60) + \" min ago\";\n    if (s < 86400) return Math.floor(s / 3600) + \" h ago\";\n    return new Date(iso).toLocaleDateString(undefined, { day: \"numeric\", month: \"short\", year: \"numeric\" });\n  };\n  const post = (path, body) => fetch(path, { method: \"POST\", headers: { \"Content-Type\": \"application/json\", \"x-claude-image-gen\": \"1\" }, body: JSON.stringify(body) }).then((r) => r.json());\n\n  async function load(append) {\n    const p = new URLSearchParams({ limit: \"30\" });\n    if (state.q) p.set(\"q\", state.q);\n    if (state.starred) p.set(\"starred\", \"1\");\n    if (append && state.batches.length) p.set(\"before\", state.batches[state.batches.length - 1].createdAt);\n    const data = await fetch(\"/api/feed?\" + p).then((r) => r.json());\n    state.batches = append ? state.batches.concat(data.batches) : data.batches;\n    state.more = data.more;\n    render();\n  }\n\n  // Keyed rendering: only tiles whose status changed are rebuilt, so finished images never flicker.\n  const tileKey = (item) => item.id + \":\" + item.status + \":\" + (item.record && item.record.starred ? 1 : 0);\n  function render() {\n    const feed = $(\"feed\");\n    const existing = new Map([...feed.children].map((n) => [n.dataset.batch, n]));\n    let prev = null;\n    for (const b of state.batches) {\n      let sec = existing.get(b.batch);\n      if (!sec) sec = buildBatch(b);\n      else { existing.delete(b.batch); updateBatch(sec, b); }\n      if (prev ? prev.nextSibling !== sec : feed.firstChild !== sec) feed.insertBefore(sec, prev ? prev.nextSibling : feed.firstChild);\n      prev = sec;\n    }\n    for (const n of existing.values()) n.remove();\n    $(\"empty\").hidden = state.batches.length > 0;\n    $(\"more\").hidden = !state.more;\n    if (state.focus) {\n      // Look the batch up directly: a selector built from the URL would throw on quotes or brackets.\n      const f = [...feed.children].find((n) => n.dataset.batch === state.focus);\n      if (f) { f.classList.add(\"focus\"); f.scrollIntoView({ block: \"start\", behavior: \"smooth\" }); state.focus = null; }\n    }\n  }\n\n  function buildBatch(b) {\n    const grid = el(\"div\", { class: \"grid\" });\n    const sec = el(\"section\", { class: \"batch\", \"data-batch\": b.batch },\n      el(\"div\", { class: \"batch-head\" },\n        el(\"div\", { class: \"prompt\", title: b.prompt }, b.prompt),\n        el(\"div\", { class: \"meta\" },\n          el(\"span\", { class: \"when\", \"data-iso\": b.createdAt }, ago(b.createdAt)),\n          b.parent ? el(\"button\", { class: \"chip\", title: \"Refined from \" + b.parent, onclick: () => openDetail(b.parent) }, \"↳ from \", el(\"span\", { class: \"mono\" }, b.parent)) : null,\n          el(\"span\", {}, b.imageModel))),\n      grid);\n    updateBatch(sec, b);\n    return sec;\n  }\n\n  function updateBatch(sec, b) {\n    const grid = sec.querySelector(\".grid\");\n    grid.style.setProperty(\"--cols\", b.items.length >= 4 ? \"4\" : \"3\");\n    const tiles = new Map([...grid.children].map((n) => [n.dataset.id, n]));\n    let prev = null;\n    for (const item of b.items) {\n      let t = tiles.get(item.id);\n      if (!t || t.dataset.key !== tileKey(item)) {\n        const fresh = buildTile(item, b);\n        if (t) t.replaceWith(fresh);\n        t = fresh;\n      }\n      tiles.delete(item.id);\n      if (prev ? prev.nextSibling !== t : grid.firstChild !== t) grid.insertBefore(t, prev ? prev.nextSibling : grid.firstChild);\n      prev = t;\n    }\n    for (const n of tiles.values()) n.remove();\n  }\n\n  function buildTile(item, b) {\n    const r = item.record;\n    const ar = r && r.width && r.height ? r.width + \"/\" + r.height : \"1\";\n    const t = el(\"div\", { class: \"tile \" + item.status, \"data-id\": item.id, \"data-key\": tileKey(item), style: \"--ar:\" + ar });\n    if (item.status === \"pending\") {\n      const timer = el(\"span\", {}, \"\");\n      const start = Date.parse(b.createdAt);\n      const tick = () => { if (!t.isConnected && t.dataset.started) return; t.dataset.started = \"1\"; timer.textContent = Math.max(0, Math.round((Date.now() - start) / 1000)) + \"s\"; setTimeout(tick, 1000); };\n      tick();\n      t.append(el(\"div\", { class: \"center\" }, el(\"div\", {}, el(\"div\", { class: \"mono\", style: \"font-size:15px;font-weight:600;color:var(--text)\" }, item.id), el(\"div\", {}, \"generating… \", timer))));\n      return t;\n    }\n    if (item.status === \"error\") {\n      t.append(el(\"div\", { class: \"center\" }, el(\"div\", {}, el(\"div\", { class: \"mono\", style: \"font-weight:600\" }, item.id), item.message || \"Failed\")));\n      return t;\n    }\n    if (r.params && r.params.background === \"transparent\") t.classList.add(\"checker\");\n    const img = el(\"img\", { src: \"/thumb/\" + item.id, alt: r.prompt, loading: \"lazy\", decoding: \"async\" });\n    img.addEventListener(\"load\", () => img.classList.add(\"loaded\"));\n    t.append(img);\n    if (r.starred) t.append(el(\"span\", { class: \"badge-star\" }, \"★\"));\n    t.append(el(\"div\", { class: \"overlay\" },\n      el(\"button\", { class: \"idtag\", title: \"Copy id\", onclick: (e) => { e.stopPropagation(); copy(item.id); } }, item.id),\n      el(\"button\", { class: \"star\" + (r.starred ? \" on\" : \"\"), title: r.starred ? \"Unstar\" : \"Star\", onclick: (e) => { e.stopPropagation(); toggleStar(item.id, !r.starred); } }, r.starred ? \"★\" : \"☆\")));\n    t.addEventListener(\"click\", () => openDetail(item.id, b));\n    return t;\n  }\n\n  async function toggleStar(id, on) {\n    await post(\"/api/star\", { id, starred: on });\n    toast(on ? \"Starred \" + id : \"Unstarred \" + id);\n  }\n\n  async function openDetail(id, batch) {\n    const res = await fetch(\"/api/image/\" + id);\n    if (!res.ok) return toast(\"Image \" + id + \" not found\");\n    const { record: r, path, children } = await res.json();\n    const siblings = (batch && batch.items.filter((i) => i.status === \"done\").map((i) => i.id)) || [id];\n    const idx = siblings.indexOf(id);\n    state.detail = { id, batch };\n    const dlg = $(\"dlg\");\n    const row = (k, v) => v ? [el(\"dt\", {}, k), el(\"dd\", {}, v)] : [];\n    const refEls = (r.refs || []).map((ref) => ref.kind === \"library\"\n      ? el(\"img\", { src: \"/thumb/\" + ref.stored, title: \"Library image \" + ref.stored, onclick: () => openDetail(ref.stored) })\n      : el(\"img\", { src: \"/input/\" + ref.stored, title: ref.source }));\n    dlg.replaceChildren(\n      el(\"div\", { class: \"detail\" },\n        el(\"div\", { class: \"stage\" + (r.params && r.params.background === \"transparent\" ? \" checker\" : \"\") },\n          el(\"button\", { class: \"close\", title: \"Close (Esc)\", onclick: () => dlg.close() }, \"✕\"),\n          el(\"img\", { src: \"/file/\" + r.id, alt: r.prompt }),\n          siblings.length > 1 ? el(\"button\", { class: \"nav prev\", title: \"Previous (←)\", onclick: () => openDetail(siblings[(idx - 1 + siblings.length) % siblings.length], batch) }, \"‹\") : null,\n          siblings.length > 1 ? el(\"button\", { class: \"nav next\", title: \"Next (→)\", onclick: () => openDetail(siblings[(idx + 1) % siblings.length], batch) }, \"›\") : null),\n        el(\"aside\", {},\n          el(\"h2\", {}, r.id,\n            el(\"button\", { class: \"btn\", onclick: () => copy(r.id) }, \"Copy id\"),\n            el(\"button\", { class: \"btn\", onclick: async () => { await toggleStar(r.id, !r.starred); openDetail(r.id, batch); } }, r.starred ? \"★ Starred\" : \"☆ Star\")),\n          el(\"div\", {}, el(\"h3\", {}, \"Prompt\"), el(\"p\", {}, r.prompt)),\n          r.revisedPrompt && r.revisedPrompt !== r.prompt ? el(\"div\", {}, el(\"h3\", {}, \"Revised prompt\"), el(\"p\", { style: \"color:var(--muted)\" }, r.revisedPrompt)) : null,\n          r.parent || children.length ? el(\"div\", {}, el(\"h3\", {}, \"Lineage\"), el(\"div\", { class: \"chips\" },\n            r.parent ? el(\"button\", { class: \"chip\", onclick: () => openDetail(r.parent) }, \"↑ parent \", el(\"span\", { class: \"mono\" }, r.parent)) : null,\n            children.map((c) => el(\"button\", { class: \"chip\", onclick: () => openDetail(c) }, \"↓ \", el(\"span\", { class: \"mono\" }, c))))) : null,\n          refEls.length ? el(\"div\", {}, el(\"h3\", {}, \"References\"), el(\"div\", { class: \"refs\" }, refEls)) : null,\n          el(\"div\", {}, el(\"h3\", {}, \"Details\"), el(\"dl\", { class: \"kv\" },\n            row(\"Created\", new Date(r.createdAt).toLocaleString()),\n            row(\"Size\", r.width ? r.width + \" × \" + r.height : r.params.size),\n            row(\"Image model\", r.imageModel),\n            row(\"Mainline\", r.mainlineModel),\n            row(\"Quality\", r.params.quality),\n            row(\"Background\", r.params.background),\n            row(\"Context\", { none: \"new image\", previous_response: \"continued conversation\", parent_image: \"parent image re-uploaded\" }[r.context]),\n            row(\"Machine\", r.machine),\n            row(\"Project\", r.cwd))),\n          el(\"div\", { class: \"chips\" },\n            el(\"button\", { class: \"btn\", onclick: () => copy(path, \"Copied file path\") }, \"Copy file path\"),\n            el(\"button\", { class: \"btn\", onclick: () => copy(\"img:\" + r.id, \"Copied reference img:\" + r.id) }, \"Copy reference\")))));\n    if (!dlg.open) dlg.showModal();\n  }\n\n  $(\"dlg\").addEventListener(\"click\", (e) => { if (e.target === $(\"dlg\")) $(\"dlg\").close(); });\n  document.addEventListener(\"keydown\", (e) => {\n    if (!$(\"dlg\").open) return;\n    if (e.key === \"ArrowRight\") $(\"dlg\").querySelector(\".nav.next\")?.click();\n    if (e.key === \"ArrowLeft\") $(\"dlg\").querySelector(\".nav.prev\")?.click();\n  });\n\n  let qTimer;\n  $(\"q\").addEventListener(\"input\", (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 200); });\n  $(\"starred\").addEventListener(\"click\", () => { state.starred = !state.starred; $(\"starred\").setAttribute(\"aria-pressed\", String(state.starred)); load(); });\n  $(\"more\").addEventListener(\"click\", () => load(true));\n  setInterval(() => document.querySelectorAll(\".when\").forEach((n) => (n.textContent = ago(n.dataset.iso))), 30_000);\n\n  document.addEventListener(\"visibilitychange\", () => { if (!document.hidden) { state.unseen = 0; document.title = \"Claude Images\"; } });\n\n  let reloadTimer;\n  const scheduleReload = () => { clearTimeout(reloadTimer); reloadTimer = setTimeout(() => load(), 120); };\n\n  function connect() {\n    const es = new EventSource(\"/events?loadedAt=\" + LOADED_AT);\n    es.onopen = () => { $(\"dot\").classList.add(\"live\"); load(); };\n    es.onerror = () => $(\"dot\").classList.remove(\"live\");\n    es.onmessage = (m) => {\n      const ev = JSON.parse(m.data);\n      if (ev.type === \"newer-tab\") {\n        // A newer gallery tab took over. Plugin-opened tabs the user hasn't navigated in may close themselves.\n        if (AUTO_OPENED && ev.loadedAt > LOADED_AT && history.length === 1) window.close();\n        return;\n      }\n      if (ev.type === \"batch\") {\n        state.focus = ev.batch;\n        history.replaceState(null, \"\", \"?batch=\" + ev.batch);\n      }\n      if (ev.type === \"image\" && document.hidden) { state.unseen++; document.title = \"(\" + state.unseen + \") Claude Images\"; }\n      if (ev.type === \"image\" || ev.type === \"error\" || ev.type === \"batch\" || ev.type === \"updated\") scheduleReload();\n      if (ev.type === \"updated\" && state.detail && state.detail.id === ev.id && $(\"dlg\").open) openDetail(ev.id, state.detail.batch);\n    };\n  }\n  connect();\n})();\n<\/script>\n</body>\n</html>\n";
//#endregion
//#region src/gallery/hub.ts
const run = promisify(execFile);
const AUTH_HEADER = "x-claude-image-gen";
/**
* Every Claude session runs its own MCP server, but there is only one gallery
* port. The first server to bind it becomes the owner; the others forward
* their events over HTTP. If the owner exits, the next event re-elects.
*/
var Gallery = class {
	server;
	role;
	/** Port the current role applies to; a galleryPort change triggers a new election. */
	rolePort;
	electing;
	clients = /* @__PURE__ */ new Set();
	pending = /* @__PURE__ */ new Map();
	get port() {
		return loadSettings().galleryPort;
	}
	url(params = {}) {
		const q = new URLSearchParams(params).toString();
		return `http://localhost:${this.port}/${q ? `?${q}` : ""}`;
	}
	async ping(port = this.port) {
		try {
			return (await (await fetch(`http://127.0.0.1:${port}/api/ping`, { signal: AbortSignal.timeout(1500) })).json()).app === APP_NAME;
		} catch {
			return false;
		}
	}
	async ensure() {
		const port = this.port;
		if (this.role && this.rolePort !== port) this.resign();
		if (this.role) return this.role;
		this.electing ??= this.elect(port).finally(() => this.electing = void 0);
		return this.electing;
	}
	async elect(port) {
		this.rolePort = port;
		if (await this.ping(port)) return this.role = "remote";
		try {
			await this.listen(port);
			return this.role = "owner";
		} catch (e) {
			if (e?.code === "EADDRINUSE" && await this.ping(port)) return this.role = "remote";
			throw new Error(e?.code === "EADDRINUSE" ? `Port ${this.port} is used by another program. Change galleryPort with the image_settings tool.` : String(e));
		}
	}
	/** Give up the current role (port changed): stop serving on the old port and disconnect its tabs. */
	resign() {
		if (this.server) {
			for (const c of this.clients) c.end();
			this.clients.clear();
			this.server.close();
			this.server = void 0;
		}
		this.role = void 0;
	}
	/** Record an event and return the gallery URL for its batch. Never throws: the gallery is optional. */
	async notify(ev) {
		const url = "batch" in ev ? this.url({ batch: ev.batch }) : this.url();
		for (let attempt = 0; attempt < 2; attempt++) try {
			if (await this.ensure() === "owner") this.apply(ev);
			else {
				const res = await fetch(`http://127.0.0.1:${this.port}/api/event`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						[AUTH_HEADER]: "1"
					},
					body: JSON.stringify(ev),
					signal: AbortSignal.timeout(3e3)
				});
				if (!res.ok) throw new Error(`gallery responded ${res.status}`);
			}
			break;
		} catch (e) {
			this.role = void 0;
			if (attempt === 1) console.error(`[gallery] could not deliver event: ${e}`);
		}
		return url;
	}
	/** Open a gallery tab. auto=1 marks it as ours, so the page may close it when a newer one replaces it. */
	open(url) {
		const u = new URL(url);
		u.searchParams.set("auto", "1");
		url = u.toString();
		const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
		spawn(cmd, [url], {
			detached: true,
			stdio: "ignore"
		}).on("error", () => {}).unref();
	}
	apply(ev) {
		if (ev.type === "batch") {
			this.pending.set(ev.batch, {
				meta: ev,
				errors: {}
			});
			while (this.pending.size > 100) this.pending.delete(this.pending.keys().next().value);
		} else if (ev.type === "error") {
			const p = this.pending.get(ev.batch);
			if (p) p.errors[ev.id] = ev.message;
		}
		const data = `data: ${JSON.stringify(ev)}\n\n`;
		for (const c of this.clients) c.write(data);
	}
	listen(port) {
		return new Promise((resolve, reject) => {
			const server = http.createServer((req, res) => {
				this.handle(req, res).catch((e) => {
					if (!res.headersSent) res.writeHead(e?.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain" });
					res.end(String(e?.message ?? e));
				});
			});
			server.once("error", reject);
			server.listen(port, "127.0.0.1", () => {
				server.off("error", reject);
				server.unref();
				this.server = server;
				resolve();
			});
		});
	}
	feed(params) {
		const limit = Math.min(Number(params.get("limit")) || 30, 200);
		const before = params.get("before");
		const q = params.get("q")?.toLowerCase().trim();
		const starred = params.get("starred") === "1";
		const groups = /* @__PURE__ */ new Map();
		for (const r of allRecords()) {
			if (starred && !r.starred) continue;
			if (q && !`${r.id} ${r.prompt} ${r.revisedPrompt ?? ""}`.toLowerCase().includes(q)) continue;
			let g = groups.get(r.batch);
			if (!g) {
				g = {
					batch: r.batch,
					createdAt: r.createdAt,
					prompt: r.prompt,
					parent: r.parent,
					imageModel: r.imageModel,
					items: []
				};
				groups.set(r.batch, g);
			}
			if (r.createdAt < g.createdAt) g.createdAt = r.createdAt;
			g.items.push({
				id: r.id,
				status: "done",
				index: r.batchIndex,
				record: summary(r)
			});
		}
		if (!starred && !q) for (const { meta, errors } of this.pending.values()) {
			let g = groups.get(meta.batch);
			if (!g) {
				g = {
					batch: meta.batch,
					createdAt: meta.createdAt,
					prompt: meta.prompt,
					parent: meta.parent,
					imageModel: meta.imageModel,
					items: []
				};
				groups.set(meta.batch, g);
			}
			g.createdAt = meta.createdAt;
			meta.ids.forEach((id, index) => {
				if (g.items.some((i) => i.id === id)) return;
				g.items.push(errors[id] ? {
					id,
					index,
					status: "error",
					message: errors[id]
				} : {
					id,
					index,
					status: "pending"
				});
			});
		}
		let list = [...groups.values()].sort((a, b) => a.createdAt < b.createdAt ? 1 : -1);
		if (before) list = list.filter((g) => g.createdAt < before);
		for (const g of list) g.items.sort((a, b) => a.index - b.index);
		return {
			batches: list.slice(0, limit),
			more: list.length > limit
		};
	}
	async handle(req, res) {
		const host = (req.headers.host ?? "").replace(/:\d+$/, "");
		if (host !== "localhost" && host !== "127.0.0.1") return void res.writeHead(403).end();
		const url = new URL(req.url ?? "/", "http://localhost");
		const p = url.pathname;
		const json = (body, status = 200) => {
			res.writeHead(status, {
				"Content-Type": "application/json",
				"Cache-Control": "no-store"
			});
			res.end(JSON.stringify(body));
		};
		if (req.method === "POST") {
			if (req.headers[AUTH_HEADER] !== "1") return void res.writeHead(403).end();
			let body;
			try {
				body = JSON.parse(await readBody(req) || "{}");
			} catch (e) {
				return json({ error: e?.message ?? "invalid body" }, 400);
			}
			if (p === "/api/event") {
				if (!isGalleryEvent(body)) return json({ error: "invalid event" }, 400);
				this.apply(body);
				return json({ ok: true });
			}
			if (p === "/api/star" && isImageId(body.id)) {
				const r = await updateRecord(body.id, (r) => void (r.starred = !!body.starred));
				this.apply({
					type: "updated",
					id: r.id
				});
				return json({
					ok: true,
					starred: !!r.starred
				});
			}
			return json({ error: "not found" }, 404);
		}
		if (p === "/") {
			res.writeHead(200, {
				"Content-Type": "text/html; charset=utf-8",
				"Cache-Control": "no-store"
			});
			res.end(PAGE_HTML);
			return;
		}
		if (p === "/api/ping") return json({
			app: APP_NAME,
			version: VERSION,
			pid: process.pid
		});
		if (p === "/api/feed") return json(this.feed(url.searchParams));
		if (p.startsWith("/api/image/")) {
			const r = await getRecord(p.slice(11));
			if (!r) return json({ error: "not found" }, 404);
			return json({
				record: r,
				path: imagePath(r),
				children: childrenOf(r.id).map((c) => c.id)
			});
		}
		if (p === "/events") {
			res.writeHead(200, {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-store",
				Connection: "keep-alive"
			});
			res.write(`data: ${JSON.stringify({
				type: "hello",
				loadedAt: Number(url.searchParams.get("loadedAt")) || 0
			})}\n\n`);
			const announce = `data: ${JSON.stringify({
				type: "newer-tab",
				loadedAt: Number(url.searchParams.get("loadedAt")) || 0
			})}\n\n`;
			for (const c of this.clients) c.write(announce);
			this.clients.add(res);
			const keepAlive = setInterval(() => res.write(": ping\n\n"), 25e3);
			keepAlive.unref();
			req.on("close", () => {
				clearInterval(keepAlive);
				this.clients.delete(res);
			});
			return;
		}
		const fileMatch = /^\/(file|thumb)\/([a-z2-9]{4})$/.exec(p);
		if (fileMatch) {
			const r = await getRecord(fileMatch[2]);
			if (!r) return void res.writeHead(404).end();
			const file = imagePath(r);
			await ensureLocal(file);
			const served = fileMatch[1] === "thumb" ? await thumbnail(r, file) : file;
			return sendFile(res, served, {
				"Content-Type": MIME[extOf(served)] ?? "application/octet-stream",
				"Cache-Control": "public, max-age=31536000, immutable"
			});
		}
		const inputMatch = /^\/input\/([a-f0-9]{16}\.[a-z]+)$/.exec(p);
		if (inputMatch) {
			const file = path.join(inputsDir(), inputMatch[1]);
			await ensureLocal(file);
			return sendFile(res, file, {
				"Content-Type": MIME[extOf(file)] ?? "application/octet-stream",
				"Cache-Control": "max-age=31536000"
			});
		}
		res.writeHead(404).end();
	}
};
/**
* Stream a file without risking the process: the file is opened before headers
* are sent (so a missing file becomes a 404 via the handler's catch), and
* pipeline() handles read errors mid-stream instead of throwing an uncaught
* 'error' event that would kill this MCP server.
*/
async function sendFile(res, file, headers) {
	const stream = fs.createReadStream(file);
	await new Promise((resolve, reject) => {
		stream.once("open", () => resolve());
		stream.once("error", reject);
	});
	res.writeHead(200, headers);
	pipeline(stream, res, (err) => {
		if (err) res.destroy();
	});
}
function summary(r) {
	return {
		id: r.id,
		width: r.width,
		height: r.height,
		starred: !!r.starred,
		parent: r.parent,
		prompt: r.prompt,
		params: r.params
	};
}
/** Machine-local thumbnail cache, so the feed doesn't ship multi-MB PNGs. Falls back to the original. */
async function thumbnail(r, file) {
	if (process.platform !== "darwin") return file;
	const keepAlpha = r.params.background === "transparent" && extOf(file) !== "jpeg";
	const dir = path.join(cacheDir(), "thumbs");
	const out = path.join(dir, `${path.parse(r.file).name}-640.${keepAlpha ? "png" : "jpeg"}`);
	if (fs.existsSync(out)) return out;
	fs.mkdirSync(dir, { recursive: true });
	try {
		await run("sips", [
			"-Z",
			"640",
			"-s",
			"format",
			keepAlpha ? "png" : "jpeg",
			file,
			"--out",
			out
		]);
		return out;
	} catch {
		return file;
	}
}
function isGalleryEvent(v) {
	const str = (x) => typeof x === "string";
	if (!v || typeof v !== "object") return false;
	switch (v.type) {
		case "batch": return str(v.batch) && Array.isArray(v.ids) && v.ids.every(str) && str(v.prompt) && str(v.imageModel) && str(v.createdAt) && (v.parent === void 0 || str(v.parent));
		case "image": return str(v.batch) && str(v.id);
		case "error": return str(v.batch) && str(v.id) && str(v.message);
		case "updated": return str(v.id);
		default: return false;
	}
}
function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (c) => {
			data += c;
			if (data.length > 1 << 20) {
				reject(/* @__PURE__ */ new Error("body too large"));
				req.destroy();
			}
		});
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}
const gallery = new Gallery();
/** Standalone mode: `node dist/server.js --gallery` keeps the gallery up without a Claude session. */
async function runStandaloneGallery() {
	const role = await gallery.ensure();
	const url = gallery.url();
	if (role === "remote") {
		console.log(`Gallery already running at ${url}`);
		gallery.open(url);
		return;
	}
	setInterval(() => {}, 1 << 30);
	console.log(`Gallery running at ${url} (Ctrl+C to stop)`);
	gallery.open(url);
}
//#endregion
//#region src/generate.ts
const RESPONSE_TTL_MS = 25056e5;
async function generate(args, onProgress) {
	const settings = loadSettings();
	const started = Date.now();
	const parent = args.from ? await resolveOne(args.from) : void 0;
	const refs = await Promise.all((args.refs ?? []).map(resolveRef));
	const tool = {
		type: "image_generation",
		model: settings.imageModel
	};
	const params = {
		size: args.size ?? settings.size,
		quality: args.quality ?? settings.quality,
		output_format: args.format ?? settings.outputFormat,
		background: args.background ?? settings.background,
		moderation: settings.moderation,
		action: args.action
	};
	for (const [k, v] of Object.entries(params)) if (v) tool[k] = v;
	let parentDataUrl;
	const getParentDataUrl = () => parentDataUrl ??= (async () => {
		const file = imagePath(parent);
		await ensureLocal(file);
		const { data, ext } = await toUploadable(file);
		return `data:${MIME[ext]};base64,${data.toString("base64")}`;
	})();
	const canUsePrevious = !!parent?.openai.responseId && Date.now() - Date.parse(parent.createdAt) < RESPONSE_TTL_MS;
	async function request(mode) {
		let text = args.prompt;
		const content = [];
		if (mode === "previous_response" && refs.length) text = `Modify the previously generated image. The attached images are references only.\n\n${text}`;
		if (mode === "parent_image") {
			text = `The first attached image is the image to modify${refs.length ? "; the others are references" : ""}.\n\n${text}`;
			content.push({
				type: "input_image",
				image_url: await getParentDataUrl()
			});
		}
		for (const r of refs) content.push({
			type: "input_image",
			image_url: r.dataUrl
		});
		content.unshift({
			type: "input_text",
			text
		});
		const body = {
			model: settings.mainlineModel,
			input: [{
				role: "user",
				content
			}],
			tools: [tool],
			tool_choice: { type: "image_generation" }
		};
		if (mode === "previous_response") body.previous_response_id = parent.openai.responseId;
		return createResponse(body);
	}
	const batch = randomToken(6);
	const batchStarted = /* @__PURE__ */ new Date();
	const ids = newIds(args.count);
	const url = await gallery.notify({
		type: "batch",
		batch,
		ids,
		prompt: args.prompt,
		parent: parent?.id,
		imageModel: settings.imageModel,
		createdAt: (/* @__PURE__ */ new Date()).toISOString()
	});
	if (args.show && settings.openGallery) gallery.open(url);
	let done = 0;
	const tick = setInterval(() => onProgress?.(done, args.count, `${done}/${args.count} done after ${Math.round((Date.now() - started) / 1e3)}s`), 5e3);
	async function runSlot(id, index) {
		try {
			let mode = parent ? canUsePrevious ? "previous_response" : "parent_image" : "none";
			let response;
			try {
				response = await request(mode);
			} catch (e) {
				if (!(mode === "previous_response" && e instanceof OpenAIError && e.isMissingPrevious)) throw e;
				mode = "parent_image";
				response = await request(mode);
			}
			if (process.env.CLAUDE_IMAGE_GEN_DEBUG) dumpResponse(id, response);
			const call = (response.output ?? []).find((o) => o.type === "image_generation_call" && o.result);
			if (!call) {
				const said = (response.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? []).map((c) => c.text).filter(Boolean).join(" ");
				throw new Error(`No image was returned.${said ? ` The model said: ${said}` : ""}`);
			}
			const ext = call.output_format || tool.output_format || "png";
			const record = {
				id,
				file: `${baseName(id, args.prompt, batchStarted)}.${ext}`,
				createdAt: (/* @__PURE__ */ new Date()).toISOString(),
				batch,
				batchIndex: index,
				batchSize: args.count,
				prompt: args.prompt,
				revisedPrompt: call.revised_prompt,
				parent: parent?.id,
				refs: refs.map((r) => r.record),
				mainlineModel: settings.mainlineModel,
				imageModel: settings.imageModel,
				params: Object.fromEntries([
					"size",
					"quality",
					"background",
					"output_format",
					"action"
				].map((k) => [k, call[k] ?? tool[k]]).filter(([, v]) => v)),
				context: mode,
				openai: {
					responseId: response.id,
					imageCallId: call.id,
					usage: {
						mainline: response.usage,
						image: response.tool_usage?.image_gen
					}
				},
				...newRecordBase()
			};
			writeFileAtomic(imagePath(record), Buffer.from(call.result, "base64"));
			const dims = await dimensions(imagePath(record));
			if (dims) Object.assign(record, dims);
			saveRecord(record);
			await gallery.notify({
				type: "image",
				batch,
				id
			});
			return {
				id,
				ok: true,
				record
			};
		} catch (e) {
			const error = e instanceof Error ? e.message : String(e);
			await gallery.notify({
				type: "error",
				batch,
				id,
				message: error
			});
			return {
				id,
				ok: false,
				error
			};
		} finally {
			done++;
			onProgress?.(done, args.count, `${done}/${args.count} done`);
		}
	}
	try {
		const results = await Promise.all(ids.map(runSlot));
		rememberBatch(results.filter((r) => r.ok).map((r) => r.id));
		return {
			batch,
			url,
			parent,
			refs,
			results,
			seconds: Math.round((Date.now() - started) / 1e3)
		};
	} finally {
		clearInterval(tick);
	}
}
/** CLAUDE_IMAGE_GEN_DEBUG=1: keep raw API responses (minus image data) for troubleshooting. */
function dumpResponse(id, response) {
	const strip = (v) => Array.isArray(v) ? v.map(strip) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "result" && typeof x === "string" ? `<${x.length} base64 chars>` : strip(x)])) : v;
	const dir = path.join(cacheDir(), "debug");
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(strip(response), null, 2));
}
//#endregion
//#region src/main.ts
const INSTRUCTIONS = `
Image generation via OpenAI (Responses API). Every image is kept permanently in the user's library
(${libraryDir()}, synced via iCloud across their Macs) and has a short id like "k7f2".

Rules:
- Images the USER asked for: always call generate_images with show=true so the live gallery opens for them,
  and give them the gallery link and the new ids. For images you generate as an intermediate step of a bigger task,
  use show=false and show the user only what matters (open_gallery).
- Iterating: pass from="<id>" (or "last") to refine an earlier image. Any earlier image can be refined, which branches.
  "last" fails if the last batch had several images; then ask which one (or pick and say so).
- References: pass images to use as references in refs: library ids, absolute file paths, URLs, or "paste:N" for the
  Nth image the user pasted into their most recent message that contains images ("[Image #2]" -> "paste:2").
  If a pasted image comes with a source path (e.g. "[Image: source: /path/to/file.png]"), pass that path instead.
- Shorthand: a leading number in a request means the variation count ("4 minimalist otter logo" -> count=4,
  prompt "minimalist otter logo"). Write a good prompt from the user's words; do not pad it with unrelated style.
- You get a preview of each result. Look at it critically. Use inspect_image with a region to zoom into details
  (text, hands, edges) before claiming an image is correct.
- Referencing images: in notes, plans and handoff documents for this user, refer to images as "img:<id>"; any session on
  any of the user's Macs can resolve them. Library paths must NOT appear in files committed to git or shared with others:
  use export_image to copy the image into the project first, then reference the exported copy.
`.trim();
const text = (t) => ({
	type: "text",
	text: t
});
const fail = (e) => ({
	content: [text(`Error: ${e instanceof Error ? e.message : String(e)}`)],
	isError: true
});
const home = (p) => p.replace(process.env.HOME ?? "\0", "~");
const keepsAlpha = (r) => r.params.background === "transparent" && extOf(r.file) !== "jpeg";
function describe(r) {
	const dims = r.width ? `${r.width}×${r.height}` : r.params.size ?? "";
	const d = new Date(r.createdAt);
	const when = `${d.toLocaleDateString("sv-SE")} ${d.toTimeString().slice(0, 5)}`;
	return `${r.id}  ${when}  ${r.starred ? "★ " : ""}${dims}  "${r.prompt.slice(0, 90)}${r.prompt.length > 90 ? "…" : ""}"${r.parent ? `  (from ${r.parent})` : ""}`;
}
/** serveStdio builds one instance per connection, pinned to the protocol era the client opens with. */
function createServer() {
	const server = new McpServer({
		name: "image-gen",
		version: VERSION
	}, { instructions: INSTRUCTIONS });
	server.registerTool("generate_images", {
		title: "Generate images",
		description: "Generate one or more images (variations run in parallel). Optionally refine an earlier image (from) and/or pass reference images (refs). Returns ids, file paths, the gallery link and a preview of each image.",
		inputSchema: object({
			prompt: string().min(1).describe("What to generate, or for a refinement: what to change."),
			count: number$1().int().min(1).max(8).default(1).describe("Number of variations."),
			from: string().optional().describe("Image id to refine, or \"last\"."),
			refs: array(string()).optional().describe("Reference images: library ids, absolute paths, URLs, or \"paste:N\" for images pasted into the chat."),
			size: string().optional().describe("e.g. \"1024x1024\", \"1536x1024\", \"1024x1536\", or WxH (multiples of 16, ≤3840, ratio ≤3:1)."),
			quality: _enum([
				"low",
				"medium",
				"high",
				"xhigh",
				"max",
				"auto"
			]).optional(),
			format: _enum([
				"png",
				"jpeg",
				"webp"
			]).optional(),
			background: _enum([
				"auto",
				"transparent",
				"opaque"
			]).optional(),
			action: _enum([
				"auto",
				"generate",
				"edit"
			]).optional().describe("Force editing vs. fresh generation; default lets the model decide."),
			show: boolean().default(true).describe("Open the gallery for the user. true for anything the user asked for.")
		}),
		annotations: {
			readOnlyHint: false,
			openWorldHint: true
		}
	}, async (args, ctx) => {
		const token = ctx.mcpReq._meta?.progressToken;
		const progress = (done, total, message) => {
			if (token === void 0) return;
			ctx.mcpReq.notify({
				method: "notifications/progress",
				params: {
					progressToken: token,
					progress: done,
					total,
					message
				}
			}).catch(() => {});
		};
		let result;
		try {
			result = await generate(args, progress);
		} catch (e) {
			return fail(e);
		}
		const ok = result.results.filter((r) => r.ok);
		const lines = [`Batch ${result.batch}: ${ok.length}/${result.results.length} image(s) in ${result.seconds}s. Gallery: ${result.url}`];
		if (result.parent) lines.push(`Refined from ${result.parent.id}.`);
		if (result.refs.length) lines.push(`References: ${result.refs.map((r) => r.record.source + (r.record.origin ? ` (${r.record.origin})` : "")).join(", ")}`);
		const content = [];
		const edge = result.results.length === 1 ? 1024 : result.results.length <= 4 ? 768 : 512;
		for (const r of result.results) {
			if (!r.ok) {
				lines.push(`• ${r.id}: FAILED: ${r.error}`);
				continue;
			}
			const rec = r.record;
			lines.push(`• ${rec.id}: ${rec.width ?? "?"}×${rec.height ?? "?"}, ${home(imagePath(rec))}` + (rec.context === "parent_image" ? " (parent re-uploaded: stored context had expired)" : ""));
			if (rec.revisedPrompt) lines.push(`  revised prompt: ${rec.revisedPrompt}`);
		}
		content.push(text(lines.join("\n")));
		for (const r of result.results) {
			if (!r.ok) continue;
			try {
				const p = await preview(imagePath(r.record), edge, keepsAlpha(r.record));
				content.push(text(`Preview of ${r.id}:`), {
					type: "image",
					data: p.data,
					mimeType: p.mimeType
				});
			} catch (e) {
				content.push(text(`(preview of ${r.id} unavailable: ${e})`));
			}
		}
		return {
			content,
			isError: ok.length === 0
		};
	});
	server.registerTool("inspect_image", {
		title: "Inspect image",
		description: "Look at a library image in detail. region zooms into part of it at native resolution (use it to check text, faces, hands, edges). box gives a custom crop as fractions [x, y, width, height].",
		inputSchema: object({
			id: string().describe("Image id or \"last\"."),
			region: _enum([
				"full",
				"top-left",
				"top-right",
				"bottom-left",
				"bottom-right",
				"top",
				"bottom",
				"left",
				"right",
				"center"
			]).default("full"),
			box: array(number$1().min(0).max(1)).length(4).optional()
		}),
		annotations: { readOnlyHint: true }
	}, async ({ id, region, box }) => {
		try {
			const r = await resolveOne(id);
			const file = imagePath(r);
			await ensureLocal(file);
			const out = await crop(file, box ?? region, 1568, keepsAlpha(r));
			return { content: [text(`${r.id} ${box ? `box ${JSON.stringify(box)}` : region}: pixels x=${out.box.x} y=${out.box.y} w=${out.box.w} h=${out.box.h} of ${out.image.width}×${out.image.height}`), {
				type: "image",
				data: out.data,
				mimeType: out.mimeType
			}] };
		} catch (e) {
			return fail(e);
		}
	});
	server.registerTool("list_images", {
		title: "List images",
		description: "List library images, newest first. Optionally filter by text, starred, or parent (to see refinements of an image).",
		inputSchema: object({
			limit: number$1().int().min(1).max(200).default(20),
			query: string().optional(),
			starred: boolean().optional(),
			parent: string().optional().describe("Only images refined from this id.")
		}),
		annotations: { readOnlyHint: true }
	}, async ({ limit, query, starred, parent }) => {
		try {
			const q = query?.toLowerCase();
			const rows = allRecords().filter((r) => !starred || r.starred).filter((r) => !parent || r.parent === parent).filter((r) => !q || `${r.id} ${r.prompt} ${r.revisedPrompt ?? ""}`.toLowerCase().includes(q)).slice(0, limit);
			return { content: [text(rows.length ? rows.map(describe).join("\n") : "No matching images.")] };
		} catch (e) {
			return fail(e);
		}
	});
	server.registerTool("export_image", {
		title: "Export image",
		description: "Copy (never move) a library image into the project, e.g. for committing to git. dest may be a directory or a file path; a different extension converts the format (macOS). Stars the image by default.",
		inputSchema: object({
			id: string(),
			dest: string().describe("Destination file or directory, relative to the project or absolute."),
			star: boolean().default(true),
			overwrite: boolean().default(false)
		}),
		annotations: { readOnlyHint: false }
	}, async ({ id, dest, star, overwrite }) => {
		try {
			const r = await resolveOne(id);
			const src = imagePath(r);
			await ensureLocal(src);
			let out = path.resolve(projectDir(), expandHome(dest));
			if (dest.endsWith("/") || fs.existsSync(out) && fs.statSync(out).isDirectory()) out = path.join(out, `${slugify(r.prompt)}.${extOf(src)}`);
			else if (!extOf(out)) out += `.${extOf(src)}`;
			if (fs.existsSync(out) && !overwrite) throw new Error(`${out} already exists (pass overwrite: true to replace it).`);
			fs.mkdirSync(path.dirname(out), { recursive: true });
			const format = (ext) => ext === "jpg" ? "jpeg" : ext;
			const want = format(extOf(out));
			if (want === format(extOf(src))) fs.copyFileSync(src, out);
			else if (process.platform === "darwin") execFileSync("sips", [
				"-s",
				"format",
				want,
				src,
				"--out",
				out
			], { stdio: "ignore" });
			else throw new Error(`Converting .${extOf(src)} to .${want} needs macOS; use a .${extOf(src)} destination.`);
			await updateRecord(r.id, (rec) => {
				rec.exports = [...rec.exports ?? [], {
					path: out,
					at: (/* @__PURE__ */ new Date()).toISOString()
				}];
				if (star) rec.starred = true;
			});
			await gallery.notify({
				type: "updated",
				id: r.id
			});
			return { content: [text(`Copied ${r.id} to ${out}${star ? " and starred it" : ""}.`)] };
		} catch (e) {
			return fail(e);
		}
	});
	/** Optional setting that also accepts "default", meaning "reset to the API default" (stored as null). */
	const resettable = (s) => s.or(literal("default")).optional();
	server.registerTool("image_settings", {
		title: "Image settings",
		description: "Show or change persistent defaults (stored in the library, so they apply to all future sessions on all Macs). Pass only what should change; \"default\" resets a value to the API default.",
		inputSchema: object({
			mainlineModel: string().optional().describe("Responses API model that drives the image tool."),
			imageModel: string().optional().describe("Image model, e.g. gpt-image-2.5-sunburst or gpt-image-2.5-flare."),
			size: resettable(string()),
			quality: resettable(_enum([
				"low",
				"medium",
				"high",
				"xhigh",
				"max",
				"auto"
			])),
			outputFormat: resettable(_enum([
				"png",
				"jpeg",
				"webp"
			])),
			background: resettable(_enum([
				"auto",
				"transparent",
				"opaque"
			])),
			moderation: resettable(_enum(["auto", "low"])),
			openGallery: boolean().optional(),
			galleryPort: number$1().int().min(1024).max(65535).optional()
		}),
		annotations: { readOnlyHint: false }
	}, async (args) => {
		try {
			const patch = {};
			for (const [k, v] of Object.entries(args)) if (v !== void 0) patch[k] = v === "default" ? null : v;
			const s = Object.keys(patch).length ? saveSettings(patch) : loadSettings();
			const keySource = process.env["OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN"] ? `env var ${KEY_NAME}` : `Keychain item ${KEY_NAME} (if present)`;
			return { content: [text(`${Object.keys(patch).length ? "Saved. " : ""}Settings (null = API default):\n${JSON.stringify(s, null, 2)}\nLibrary: ${libraryDir()} (settings shared by all Macs)\nThis Mac only: galleryPort, openGallery (${localSettingsPath()})\nAPI key from: ${keySource}`)] };
		} catch (e) {
			return fail(e);
		}
	});
	server.registerTool("list_image_models", {
		title: "List image models",
		description: "Ask OpenAI which image models (and candidate mainline models) this API key can use.",
		inputSchema: object({}),
		annotations: {
			readOnlyHint: true,
			openWorldHint: true
		}
	}, async () => {
		try {
			const ids = await listModels();
			const s = loadSettings();
			const image = ids.filter((m) => /image|dall-e/.test(m));
			const mainline = ids.filter((m) => /^(gpt-[4-9]|o\d)/.test(m) && !/image|audio|realtime|transcribe|tts|search|embedding/.test(m));
			return { content: [text(`Current: mainline=${s.mainlineModel}, image=${s.imageModel}\n\nImage models:\n${image.join("\n") || "(none)"}\n\nMainline candidates (not all support the image tool):\n${mainline.join("\n")}`)] };
		} catch (e) {
			return fail(e);
		}
	});
	server.registerTool("open_gallery", {
		title: "Open gallery",
		description: "Open the live gallery in the user's browser, optionally focused on a batch or an image.",
		inputSchema: object({
			id: string().optional(),
			batch: string().optional()
		}),
		annotations: { readOnlyHint: true }
	}, async ({ id, batch }) => {
		try {
			if (id && !batch) batch = (await resolveOne(id)).batch;
			await gallery.ensure();
			const url = gallery.url(batch ? { batch } : {});
			gallery.open(url);
			return { content: [text(`Opened ${url}`)] };
		} catch (e) {
			return fail(e);
		}
	});
	return server;
}
if (process.argv.includes("--gallery")) await runStandaloneGallery();
else {
	process.stdin.on("close", () => process.exit(0));
	serveStdio(createServer, { onerror: (e) => console.error(`[mcp] ${e.message}`) });
}
//#endregion
export {};
