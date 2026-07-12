var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var _t2, _e2, _a, _b;
typeof window < "u" && (window.__svelte || (window.__svelte = { v: /* @__PURE__ */ new Set() })).v.add("5");
const cr = 2, dr = "[", fr = "]", Qe = {}, I = Symbol(), si = false, Q = 2, gi = 4, St = 8, Yt = 16, ge = 32, Ve = 64, pt = 128, j = 256, vt = 512, q = 1024, _e = 2048, Ke = 4096, wt = 8192, Dt = 16384, hr = 32768, br = 65536, pr = 1 << 19, _i = 1 << 20, ct = Symbol("$state"), vr = Symbol("legacy props");
var xi = Array.isArray, wr = Array.prototype.indexOf, mr = Array.from, mt = Object.keys, gt = Object.defineProperty, We = Object.getOwnPropertyDescriptor, gr = Object.getOwnPropertyDescriptors, _r = Object.prototype, xr = Array.prototype, yi = Object.getPrototypeOf;
const dt = () => {
};
function Ci(t) {
  for (var e = 0; e < t.length; e++)
    t[e]();
}
let et = [], It = [];
function Ei() {
  var t = et;
  et = [], Ci(t);
}
function yr() {
  var t = It;
  It = [], Ci(t);
}
function Xt(t) {
  et.length === 0 && queueMicrotask(Ei), et.push(t);
}
function oi() {
  et.length > 0 && Ei(), It.length > 0 && yr();
}
function ki(t) {
  return t === this.v;
}
function Si(t, e) {
  return t != t ? e == e : t !== e || t !== null && typeof t == "object" || typeof t == "function";
}
function Cr(t) {
  return !Si(t, this.v);
}
function Er(t) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function kr() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function Sr(t) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function Dr() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function Tr() {
  throw new Error("https://svelte.dev/e/hydration_failed");
}
function Rr() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function $r() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function Or() {
  throw new Error("https://svelte.dev/e/state_unsafe_local_read");
}
function Ar() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
let Lr = false;
function ne(t, e) {
  var i = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v: t,
    reactions: null,
    equals: ki,
    rv: 0,
    wv: 0
  };
  return i;
}
function Ft(t) {
  return /* @__PURE__ */ Mr(ne(t));
}
// @__NO_SIDE_EFFECTS__
function Di(t, e = false) {
  const i = ne(t);
  return e || (i.equals = Cr), i;
}
// @__NO_SIDE_EFFECTS__
function Mr(t) {
  return D !== null && !Z && (D.f & Q) !== 0 && (se === null ? zr([t]) : se.push(t)), t;
}
function K(t, e) {
  return D !== null && !Z && Xi() && (D.f & (Q | Yt)) !== 0 && // If the source was created locally within the current derived, then
  // we allow the mutation.
  (se === null || !se.includes(t)) && Ar(), Fr(t, e);
}
function Fr(t, e) {
  return t.equals(e) || (t.v, t.v = e, t.wv = Ui(), Ti(t, _e), R !== null && (R.f & q) !== 0 && (R.f & (ge | Ve)) === 0 && (le === null ? Br([t]) : le.push(t))), e;
}
function Ti(t, e) {
  var i = t.reactions;
  if (i !== null)
    for (var r = i.length, n = 0; n < r; n++) {
      var o = i[n], c = o.f;
      (c & _e) === 0 && (ce(o, e), (c & (q | j)) !== 0 && ((c & Q) !== 0 ? Ti(
        /** @type {Derived} */
        o,
        Ke
      ) : ei(
        /** @type {Effect} */
        o
      )));
    }
}
// @__NO_SIDE_EFFECTS__
function Ri(t) {
  var e = Q | _e, i = D !== null && (D.f & Q) !== 0 ? (
    /** @type {Derived} */
    D
  ) : null;
  return R === null || i !== null && (i.f & j) !== 0 ? e |= j : R.f |= _i, {
    ctx: z,
    deps: null,
    effects: null,
    equals: ki,
    f: e,
    fn: t,
    reactions: null,
    rv: 0,
    v: (
      /** @type {V} */
      null
    ),
    wv: 0,
    parent: i ?? R
  };
}
function $i(t) {
  var e = t.effects;
  if (e !== null) {
    t.effects = null;
    for (var i = 0; i < e.length; i += 1)
      me(
        /** @type {Effect} */
        e[i]
      );
  }
}
function Nr(t) {
  for (var e = t.parent; e !== null; ) {
    if ((e.f & Q) === 0)
      return (
        /** @type {Effect} */
        e
      );
    e = e.parent;
  }
  return null;
}
function Pr(t) {
  var e, i = R;
  we(Nr(t));
  try {
    $i(t), e = Bi(t);
  } finally {
    we(i);
  }
  return e;
}
function Oi(t) {
  var e = Pr(t), i = (pe || (t.f & j) !== 0) && t.deps !== null ? Ke : q;
  ce(t, i), t.equals(e) || (t.v = e, t.wv = Ui());
}
function Zt(t) {
  console.warn("https://svelte.dev/e/hydration_mismatch");
}
let J = false;
function at(t) {
  J = t;
}
let B;
function _t(t) {
  if (t === null)
    throw Zt(), Qe;
  return B = t;
}
function Ai() {
  return _t(
    /** @type {TemplateNode} */
    /* @__PURE__ */ Tt(B)
  );
}
function Nt(t) {
  if (J) {
    if (/* @__PURE__ */ Tt(B) !== null)
      throw Zt(), Qe;
    B = t;
  }
}
function Ee(t, e = null, i) {
  if (typeof t != "object" || t === null || ct in t)
    return t;
  const r = yi(t);
  if (r !== _r && r !== xr)
    return t;
  var n = /* @__PURE__ */ new Map(), o = xi(t), c = ne(0);
  o && n.set("length", ne(
    /** @type {any[]} */
    t.length
  ));
  var h;
  return new Proxy(
    /** @type {any} */
    t,
    {
      defineProperty(f, d, v) {
        (!("value" in v) || v.configurable === false || v.enumerable === false || v.writable === false) && Rr();
        var w = n.get(d);
        return w === void 0 ? (w = ne(v.value), n.set(d, w)) : K(w, Ee(v.value, h)), true;
      },
      deleteProperty(f, d) {
        var v = n.get(d);
        if (v === void 0)
          d in f && n.set(d, ne(I));
        else {
          if (o && typeof d == "string") {
            var w = (
              /** @type {Source<number>} */
              n.get("length")
            ), s = Number(d);
            Number.isInteger(s) && s < w.v && K(w, s);
          }
          K(v, I), ai(c);
        }
        return true;
      },
      get(f, d, v) {
        var _a2;
        if (d === ct)
          return t;
        var w = n.get(d), s = d in f;
        if (w === void 0 && (!s || ((_a2 = We(f, d)) == null ? void 0 : _a2.writable)) && (w = ne(Ee(s ? f[d] : I, h)), n.set(d, w)), w !== void 0) {
          var u = U(w);
          return u === I ? void 0 : u;
        }
        return Reflect.get(f, d, v);
      },
      getOwnPropertyDescriptor(f, d) {
        var v = Reflect.getOwnPropertyDescriptor(f, d);
        if (v && "value" in v) {
          var w = n.get(d);
          w && (v.value = U(w));
        } else if (v === void 0) {
          var s = n.get(d), u = s == null ? void 0 : s.v;
          if (s !== void 0 && u !== I)
            return {
              enumerable: true,
              configurable: true,
              value: u,
              writable: true
            };
        }
        return v;
      },
      has(f, d) {
        var _a2;
        if (d === ct)
          return true;
        var v = n.get(d), w = v !== void 0 && v.v !== I || Reflect.has(f, d);
        if (v !== void 0 || R !== null && (!w || ((_a2 = We(f, d)) == null ? void 0 : _a2.writable))) {
          v === void 0 && (v = ne(w ? Ee(f[d], h) : I), n.set(d, v));
          var s = U(v);
          if (s === I)
            return false;
        }
        return w;
      },
      set(f, d, v, w) {
        var _a2;
        var s = n.get(d), u = d in f;
        if (o && d === "length")
          for (var a = v; a < /** @type {Source<number>} */
          s.v; a += 1) {
            var l = n.get(a + "");
            l !== void 0 ? K(l, I) : a in f && (l = ne(I), n.set(a + "", l));
          }
        s === void 0 ? (!u || ((_a2 = We(f, d)) == null ? void 0 : _a2.writable)) && (s = ne(void 0), K(s, Ee(v, h)), n.set(d, s)) : (u = s.v !== I, K(s, Ee(v, h)));
        var p = Reflect.getOwnPropertyDescriptor(f, d);
        if ((p == null ? void 0 : p.set) && p.set.call(w, v), !u) {
          if (o && typeof d == "string") {
            var O = (
              /** @type {Source<number>} */
              n.get("length")
            ), A = Number(d);
            Number.isInteger(A) && A >= O.v && K(O, A + 1);
          }
          ai(c);
        }
        return true;
      },
      ownKeys(f) {
        U(c);
        var d = Reflect.ownKeys(f).filter((s) => {
          var u = n.get(s);
          return u === void 0 || u.v !== I;
        });
        for (var [v, w] of n)
          w.v !== I && !(v in f) && d.push(v);
        return d;
      },
      setPrototypeOf() {
        $r();
      }
    }
  );
}
function ai(t, e = 1) {
  K(t, t.v + e);
}
var li, Li, Mi, Fi;
function Wt() {
  if (li === void 0) {
    li = window, Li = /Firefox/.test(navigator.userAgent);
    var t = Element.prototype, e = Node.prototype;
    Mi = We(e, "firstChild").get, Fi = We(e, "nextSibling").get, t.__click = void 0, t.__className = void 0, t.__attributes = null, t.__styles = null, t.__e = void 0, Text.prototype.__t = void 0;
  }
}
function Ni(t = "") {
  return document.createTextNode(t);
}
// @__NO_SIDE_EFFECTS__
function xt(t) {
  return Mi.call(t);
}
// @__NO_SIDE_EFFECTS__
function Tt(t) {
  return Fi.call(t);
}
function Pt(t, e) {
  if (!J)
    return /* @__PURE__ */ xt(t);
  var i = (
    /** @type {TemplateNode} */
    /* @__PURE__ */ xt(B)
  );
  return i === null && (i = B.appendChild(Ni())), _t(i), i;
}
function Ur(t) {
  t.textContent = "";
}
let ft = false, yt = false, Ct = null, ht = false, Qt = false;
function ui(t) {
  Qt = t;
}
let Je = [];
let D = null, Z = false;
function ve(t) {
  D = t;
}
let R = null;
function we(t) {
  R = t;
}
let se = null;
function zr(t) {
  se = t;
}
let P = null, V = 0, le = null;
function Br(t) {
  le = t;
}
let Pi = 1, Et = 0, pe = false;
function Ui() {
  return ++Pi;
}
function Rt(t) {
  var _a2;
  var e = t.f;
  if ((e & _e) !== 0)
    return true;
  if ((e & Ke) !== 0) {
    var i = t.deps, r = (e & j) !== 0;
    if (i !== null) {
      var n, o, c = (e & vt) !== 0, h = r && R !== null && !pe, f = i.length;
      if (c || h) {
        var d = (
          /** @type {Derived} */
          t
        ), v = d.parent;
        for (n = 0; n < f; n++)
          o = i[n], (c || !((_a2 = o == null ? void 0 : o.reactions) == null ? void 0 : _a2.includes(d))) && (o.reactions ?? (o.reactions = [])).push(d);
        c && (d.f ^= vt), h && v !== null && (v.f & j) === 0 && (d.f ^= j);
      }
      for (n = 0; n < f; n++)
        if (o = i[n], Rt(
          /** @type {Derived} */
          o
        ) && Oi(
          /** @type {Derived} */
          o
        ), o.wv > t.wv)
          return true;
    }
    (!r || R !== null && !pe) && ce(t, q);
  }
  return false;
}
function Ir(t, e) {
  for (var i = e; i !== null; ) {
    if ((i.f & pt) !== 0)
      try {
        i.fn(t);
        return;
      } catch {
        i.f ^= pt;
      }
    i = i.parent;
  }
  throw ft = false, t;
}
function Wr(t) {
  return (t.f & Dt) === 0 && (t.parent === null || (t.parent.f & pt) === 0);
}
function $t(t, e, i, r) {
  if (ft) {
    if (i === null && (ft = false), Wr(e))
      throw t;
    return;
  }
  i !== null && (ft = true);
  {
    Ir(t, e);
    return;
  }
}
function zi(t, e, i = true) {
  var r = t.reactions;
  if (r !== null)
    for (var n = 0; n < r.length; n++) {
      var o = r[n];
      (o.f & Q) !== 0 ? zi(
        /** @type {Derived} */
        o,
        e,
        false
      ) : e === o && (i ? ce(o, _e) : (o.f & q) !== 0 && ce(o, Ke), ei(
        /** @type {Effect} */
        o
      ));
    }
}
function Bi(t) {
  var _a2;
  var e = P, i = V, r = le, n = D, o = pe, c = se, h = z, f = Z, d = t.f;
  P = /** @type {null | Value[]} */
  null, V = 0, le = null, pe = (d & j) !== 0 && (Z || !ht || D === null), D = (d & (ge | Ve)) === 0 ? t : null, se = null, ci(t.ctx), Z = false, Et++;
  try {
    var v = (
      /** @type {Function} */
      (0, t.fn)()
    ), w = t.deps;
    if (P !== null) {
      var s;
      if (kt(t, V), w !== null && V > 0)
        for (w.length = V + P.length, s = 0; s < P.length; s++)
          w[V + s] = P[s];
      else
        t.deps = w = P;
      if (!pe)
        for (s = V; s < w.length; s++)
          ((_a2 = w[s]).reactions ?? (_a2.reactions = [])).push(t);
    } else w !== null && V < w.length && (kt(t, V), w.length = V);
    if (Xi() && le !== null && !Z && w !== null && (t.f & (Q | Ke | _e)) === 0)
      for (s = 0; s < /** @type {Source[]} */
      le.length; s++)
        zi(
          le[s],
          /** @type {Effect} */
          t
        );
    return n !== null && Et++, v;
  } finally {
    P = e, V = i, le = r, D = n, pe = o, se = c, ci(h), Z = f;
  }
}
function Vr(t, e) {
  let i = e.reactions;
  if (i !== null) {
    var r = wr.call(i, t);
    if (r !== -1) {
      var n = i.length - 1;
      n === 0 ? i = e.reactions = null : (i[r] = i[n], i.pop());
    }
  }
  i === null && (e.f & Q) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (P === null || !P.includes(e)) && (ce(e, Ke), (e.f & (j | vt)) === 0 && (e.f ^= vt), $i(
    /** @type {Derived} **/
    e
  ), kt(
    /** @type {Derived} **/
    e,
    0
  ));
}
function kt(t, e) {
  var i = t.deps;
  if (i !== null)
    for (var r = e; r < i.length; r++)
      Vr(t, i[r]);
}
function Jt(t) {
  var e = t.f;
  if ((e & Dt) === 0) {
    ce(t, q);
    var i = R, r = z, n = ht;
    R = t, ht = true;
    try {
      (e & Yt) !== 0 ? nn(t) : Ki(t), Vi(t);
      var o = Bi(t);
      t.teardown = typeof o == "function" ? o : null, t.wv = Pi;
      var c = t.deps, h;
      si && Lr && t.f & _e;
    } catch (f) {
      $t(f, t, i, r || t.ctx);
    } finally {
      ht = n, R = i;
    }
  }
}
function Kr() {
  try {
    Dr();
  } catch (t) {
    if (Ct !== null)
      $t(t, Ct, null);
    else
      throw t;
  }
}
function Ii() {
  try {
    for (var t = 0; Je.length > 0; ) {
      t++ > 1e3 && Kr();
      var e = Je, i = e.length;
      Je = [];
      for (var r = 0; r < i; r++) {
        var n = e[r];
        (n.f & q) === 0 && (n.f ^= q);
        var o = Hr(n);
        qr(o);
      }
    }
  } finally {
    yt = false, Ct = null;
  }
}
function qr(t) {
  var e = t.length;
  if (e !== 0)
    for (var i = 0; i < e; i++) {
      var r = t[i];
      if ((r.f & (Dt | wt)) === 0)
        try {
          Rt(r) && (Jt(r), r.deps === null && r.first === null && r.nodes_start === null && (r.teardown === null ? qi(r) : r.fn = null));
        } catch (n) {
          $t(n, r, null, r.ctx);
        }
    }
}
function ei(t) {
  yt || (yt = true, queueMicrotask(Ii));
  for (var e = Ct = t; e.parent !== null; ) {
    e = e.parent;
    var i = e.f;
    if ((i & (Ve | ge)) !== 0) {
      if ((i & q) === 0) return;
      e.f ^= q;
    }
  }
  Je.push(e);
}
function Hr(t) {
  for (var e = [], i = t.first; i !== null; ) {
    var r = i.f, n = (r & ge) !== 0, o = n && (r & q) !== 0;
    if (!o && (r & wt) === 0) {
      if ((r & gi) !== 0)
        e.push(i);
      else if (n)
        i.f ^= q;
      else {
        var c = D;
        try {
          D = i, Rt(i) && Jt(i);
        } catch (d) {
          $t(d, i, null, i.ctx);
        } finally {
          D = c;
        }
      }
      var h = i.first;
      if (h !== null) {
        i = h;
        continue;
      }
    }
    var f = i.parent;
    for (i = i.next; i === null && f !== null; )
      i = f.next, f = f.parent;
  }
  return e;
}
function Ge(t) {
  var e;
  for (oi(); Je.length > 0; )
    yt = true, Ii(), oi();
  return (
    /** @type {T} */
    e
  );
}
function U(t) {
  var e = t.f, i = (e & Q) !== 0;
  if (D !== null && !Z) {
    se !== null && se.includes(t) && Or();
    var r = D.deps;
    t.rv < Et && (t.rv = Et, P === null && r !== null && r[V] === t ? V++ : P === null ? P = [t] : (!pe || !P.includes(t)) && P.push(t));
  } else if (i && /** @type {Derived} */
  t.deps === null && /** @type {Derived} */
  t.effects === null) {
    var n = (
      /** @type {Derived} */
      t
    ), o = n.parent;
    o !== null && (o.f & j) === 0 && (n.f ^= j);
  }
  return i && (n = /** @type {Derived} */
  t, Rt(n) && Oi(n)), t.v;
}
function tt(t) {
  var e = Z;
  try {
    return Z = true, t();
  } finally {
    Z = e;
  }
}
const jr = -7169;
function ce(t, e) {
  t.f = t.f & jr | e;
}
function Gr(t) {
  R === null && D === null && Sr(), D !== null && (D.f & j) !== 0 && R === null && kr(), Qt && Er();
}
function Yr(t, e) {
  var i = e.last;
  i === null ? e.last = e.first = t : (i.next = t, t.prev = i, e.last = t);
}
function ke(t, e, i, r = true) {
  var n = (t & Ve) !== 0, o = R, c = {
    ctx: z,
    deps: null,
    nodes_start: null,
    nodes_end: null,
    f: t | _e,
    first: null,
    fn: e,
    last: null,
    next: null,
    parent: n ? null : o,
    prev: null,
    teardown: null,
    transitions: null,
    wv: 0
  };
  if (i)
    try {
      Jt(c), c.f |= hr;
    } catch (d) {
      throw me(c), d;
    }
  else e !== null && ei(c);
  var h = i && c.deps === null && c.first === null && c.nodes_start === null && c.teardown === null && (c.f & (_i | pt)) === 0;
  if (!h && !n && r && (o !== null && Yr(c, o), D !== null && (D.f & Q) !== 0)) {
    var f = (
      /** @type {Derived} */
      D
    );
    (f.effects ?? (f.effects = [])).push(c);
  }
  return c;
}
function Xr(t) {
  const e = ke(St, null, false);
  return ce(e, q), e.teardown = t, e;
}
function Zr(t) {
  Gr();
  var e = R !== null && (R.f & ge) !== 0 && z !== null && !z.m;
  if (e) {
    var i = (
      /** @type {ComponentContext} */
      z
    );
    (i.e ?? (i.e = [])).push({
      fn: t,
      effect: R,
      reaction: D
    });
  } else {
    var r = ti(t);
    return r;
  }
}
function Qr(t) {
  const e = ke(Ve, t, true);
  return () => {
    me(e);
  };
}
function Jr(t) {
  const e = ke(Ve, t, true);
  return (i = {}) => new Promise((r) => {
    i.outro ? sn(e, () => {
      me(e), r(void 0);
    }) : (me(e), r(void 0));
  });
}
function ti(t) {
  return ke(gi, t, false);
}
function Wi(t) {
  return ke(St, t, true);
}
function en(t, e = [], i = Ri) {
  const r = e.map(i);
  return tn(() => t(...r.map(U)));
}
function tn(t, e = 0) {
  return ke(St | Yt | e, t, true);
}
function rn(t, e = true) {
  return ke(St | ge, t, true, e);
}
function Vi(t) {
  var e = t.teardown;
  if (e !== null) {
    const i = Qt, r = D;
    ui(true), ve(null);
    try {
      e.call(null);
    } finally {
      ui(i), ve(r);
    }
  }
}
function Ki(t, e = false) {
  var i = t.first;
  for (t.first = t.last = null; i !== null; ) {
    var r = i.next;
    me(i, e), i = r;
  }
}
function nn(t) {
  for (var e = t.first; e !== null; ) {
    var i = e.next;
    (e.f & ge) === 0 && me(e), e = i;
  }
}
function me(t, e = true) {
  var i = false;
  if ((e || (t.f & pr) !== 0) && t.nodes_start !== null) {
    for (var r = t.nodes_start, n = t.nodes_end; r !== null; ) {
      var o = r === n ? null : (
        /** @type {TemplateNode} */
        /* @__PURE__ */ Tt(r)
      );
      r.remove(), r = o;
    }
    i = true;
  }
  Ki(t, e && !i), kt(t, 0), ce(t, Dt);
  var c = t.transitions;
  if (c !== null)
    for (const f of c)
      f.stop();
  Vi(t);
  var h = t.parent;
  h !== null && h.first !== null && qi(t), t.next = t.prev = t.teardown = t.ctx = t.deps = t.fn = t.nodes_start = t.nodes_end = null;
}
function qi(t) {
  var e = t.parent, i = t.prev, r = t.next;
  i !== null && (i.next = r), r !== null && (r.prev = i), e !== null && (e.first === t && (e.first = r), e.last === t && (e.last = i));
}
function sn(t, e) {
  var i = [];
  Hi(t, i, true), on(i, () => {
    me(t), e && e();
  });
}
function on(t, e) {
  var i = t.length;
  if (i > 0) {
    var r = () => --i || e();
    for (var n of t)
      n.out(r);
  } else
    e();
}
function Hi(t, e, i) {
  if ((t.f & wt) === 0) {
    if (t.f ^= wt, t.transitions !== null)
      for (const c of t.transitions)
        (c.is_global || i) && e.push(c);
    for (var r = t.first; r !== null; ) {
      var n = r.next, o = (r.f & br) !== 0 || (r.f & ge) !== 0;
      Hi(r, e, o ? i : false), r = n;
    }
  }
}
function ji(t) {
  throw new Error("https://svelte.dev/e/lifecycle_outside_component");
}
let z = null;
function ci(t) {
  z = t;
}
function Gi(t, e = false, i) {
  z = {
    p: z,
    c: null,
    e: null,
    m: false,
    s: t,
    x: null,
    l: null
  };
}
function Yi(t) {
  const e = z;
  if (e !== null) {
    t !== void 0 && (e.x = t);
    const c = e.e;
    if (c !== null) {
      var i = R, r = D;
      e.e = null;
      try {
        for (var n = 0; n < c.length; n++) {
          var o = c[n];
          we(o.effect), ve(o.reaction), ti(o.fn);
        }
      } finally {
        we(i), ve(r);
      }
    }
    z = e.p, e.m = true;
  }
  return t || /** @type {T} */
  {};
}
function Xi() {
  return true;
}
const an = ["touchstart", "touchmove"];
function ln(t) {
  return an.includes(t);
}
function un(t) {
  var e = D, i = R;
  ve(null), we(null);
  try {
    return t();
  } finally {
    ve(e), we(i);
  }
}
const Zi = /* @__PURE__ */ new Set(), Vt = /* @__PURE__ */ new Set();
function cn(t, e, i, r = {}) {
  function n(o) {
    if (r.capture || Ye.call(e, o), !o.cancelBubble)
      return un(() => i == null ? void 0 : i.call(this, o));
  }
  return t.startsWith("pointer") || t.startsWith("touch") || t === "wheel" ? Xt(() => {
    e.addEventListener(t, n, r);
  }) : e.addEventListener(t, n, r), n;
}
function lt(t, e, i, r, n) {
  var o = { capture: r, passive: n }, c = cn(t, e, i, o);
  (e === document.body || e === window || e === document) && Xr(() => {
    e.removeEventListener(t, c, o);
  });
}
function dn(t) {
  for (var e = 0; e < t.length; e++)
    Zi.add(t[e]);
  for (var i of Vt)
    i(t);
}
function Ye(t) {
  var _a2;
  var e = this, i = (
    /** @type {Node} */
    e.ownerDocument
  ), r = t.type, n = ((_a2 = t.composedPath) == null ? void 0 : _a2.call(t)) || [], o = (
    /** @type {null | Element} */
    n[0] || t.target
  ), c = 0, h = t.__root;
  if (h) {
    var f = n.indexOf(h);
    if (f !== -1 && (e === document || e === /** @type {any} */
    window)) {
      t.__root = e;
      return;
    }
    var d = n.indexOf(e);
    if (d === -1)
      return;
    f <= d && (c = f);
  }
  if (o = /** @type {Element} */
  n[c] || t.target, o !== e) {
    gt(t, "currentTarget", {
      configurable: true,
      get() {
        return o || i;
      }
    });
    var v = D, w = R;
    ve(null), we(null);
    try {
      for (var s, u = []; o !== null; ) {
        var a = o.assignedSlot || o.parentNode || /** @type {any} */
        o.host || null;
        try {
          var l = o["__" + r];
          if (l !== void 0 && (!/** @type {any} */
          o.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
          // -> the target could not have been disabled because it emits the event in the first place
          t.target === o))
            if (xi(l)) {
              var [p, ...O] = l;
              p.apply(o, [t, ...O]);
            } else
              l.call(o, t);
        } catch (A) {
          s ? u.push(A) : s = A;
        }
        if (t.cancelBubble || a === e || a === null)
          break;
        o = a;
      }
      if (s) {
        for (let A of u)
          queueMicrotask(() => {
            throw A;
          });
        throw s;
      }
    } finally {
      t.__root = e, delete t.currentTarget, ve(v), we(w);
    }
  }
}
function fn(t) {
  var e = document.createElement("template");
  return e.innerHTML = t, e.content;
}
function Kt(t, e) {
  var i = (
    /** @type {Effect} */
    R
  );
  i.nodes_start === null && (i.nodes_start = t, i.nodes_end = e);
}
// @__NO_SIDE_EFFECTS__
function hn(t, e) {
  var i = (e & cr) !== 0, r, n = !t.startsWith("<!>");
  return () => {
    if (J)
      return Kt(B, null), B;
    r === void 0 && (r = fn(n ? t : "<!>" + t), r = /** @type {Node} */
    /* @__PURE__ */ xt(r));
    var o = (
      /** @type {TemplateNode} */
      i || Li ? document.importNode(r, true) : r.cloneNode(true)
    );
    return Kt(o, o), o;
  };
}
function Qi(t, e) {
  if (J) {
    R.nodes_end = B, Ai();
    return;
  }
  t !== null && t.before(
    /** @type {Node} */
    e
  );
}
function Ji(t, e) {
  return er(t, e);
}
function bn(t, e) {
  Wt(), e.intro = e.intro ?? false;
  const i = e.target, r = J, n = B;
  try {
    for (var o = (
      /** @type {TemplateNode} */
      /* @__PURE__ */ xt(i)
    ); o && (o.nodeType !== 8 || /** @type {Comment} */
    o.data !== dr); )
      o = /** @type {TemplateNode} */
      /* @__PURE__ */ Tt(o);
    if (!o)
      throw Qe;
    at(true), _t(
      /** @type {Comment} */
      o
    ), Ai();
    const c = er(t, { ...e, anchor: o });
    if (B === null || B.nodeType !== 8 || /** @type {Comment} */
    B.data !== fr)
      throw Zt(), Qe;
    return at(false), /**  @type {Exports} */
    c;
  } catch (c) {
    if (c === Qe)
      return e.recover === false && Tr(), Wt(), Ur(i), at(false), Ji(t, e);
    throw c;
  } finally {
    at(r), _t(n);
  }
}
const Ue = /* @__PURE__ */ new Map();
function er(t, { target: e, anchor: i, props: r = {}, events: n, context: o, intro: c = true }) {
  Wt();
  var h = /* @__PURE__ */ new Set(), f = (w) => {
    for (var s = 0; s < w.length; s++) {
      var u = w[s];
      if (!h.has(u)) {
        h.add(u);
        var a = ln(u);
        e.addEventListener(u, Ye, { passive: a });
        var l = Ue.get(u);
        l === void 0 ? (document.addEventListener(u, Ye, { passive: a }), Ue.set(u, 1)) : Ue.set(u, l + 1);
      }
    }
  };
  f(mr(Zi)), Vt.add(f);
  var d = void 0, v = Jr(() => {
    var w = i ?? e.appendChild(Ni());
    return rn(() => {
      if (o) {
        Gi({});
        var s = (
          /** @type {ComponentContext} */
          z
        );
        s.c = o;
      }
      n && (r.$$events = n), J && Kt(
        /** @type {TemplateNode} */
        w,
        null
      ), d = t(w, r) || {}, J && (R.nodes_end = B), o && Yi();
    }), () => {
      var _a2;
      for (var s of h) {
        e.removeEventListener(s, Ye);
        var u = (
          /** @type {number} */
          Ue.get(s)
        );
        --u === 0 ? (document.removeEventListener(s, Ye), Ue.delete(s)) : Ue.set(s, u);
      }
      Vt.delete(f), w !== i && ((_a2 = w.parentNode) == null ? void 0 : _a2.removeChild(w));
    };
  });
  return qt.set(d, v), d;
}
let qt = /* @__PURE__ */ new WeakMap();
function pn(t, e) {
  const i = qt.get(t);
  return i ? (qt.delete(t), i(e)) : Promise.resolve();
}
function vn(t, e) {
  Xt(() => {
    var i = t.getRootNode(), r = (
      /** @type {ShadowRoot} */
      i.host ? (
        /** @type {ShadowRoot} */
        i
      ) : (
        /** @type {Document} */
        i.head ?? /** @type {Document} */
        i.ownerDocument.head
      )
    );
    if (!r.querySelector("#" + e.hash)) {
      const n = document.createElement("style");
      n.id = e.hash, n.textContent = e.code, r.appendChild(n);
    }
  });
}
const di = [...` 	
\r\f\xA0\v\uFEFF`];
function wn(t, e, i) {
  var r = t == null ? "" : "" + t;
  if (r = r ? r + " " + e : e, i) {
    for (var n in i)
      if (i[n])
        r = r ? r + " " + n : n;
      else if (r.length)
        for (var o = n.length, c = 0; (c = r.indexOf(n, c)) >= 0; ) {
          var h = c + o;
          (c === 0 || di.includes(r[c - 1])) && (h === r.length || di.includes(r[h])) ? r = (c === 0 ? "" : r.substring(0, c)) + r.substring(h + 1) : c = h;
        }
  }
  return r === "" ? null : r;
}
function mn(t, e, i, r, n, o) {
  var c = t.__className;
  if (J || c !== i) {
    var h = wn(i, r, o);
    (!J || h !== t.getAttribute("class")) && (h == null ? t.removeAttribute("class") : t.className = h), t.__className = i;
  } else if (o)
    for (var f in o) {
      var d = !!o[f];
      (n == null || d !== !!n[f]) && t.classList.toggle(f, d);
    }
  return o;
}
function fi(t, e, i, r) {
  var n = t.__attributes ?? (t.__attributes = {});
  J && (n[e] = t.getAttribute(e)), n[e] !== (n[e] = i) && ("__styles" in t && (t.__styles = {}), i == null ? t.removeAttribute(e) : typeof i != "string" && gn(t).includes(e) ? t[e] = i : t.setAttribute(e, i));
}
var hi = /* @__PURE__ */ new Map();
function gn(t) {
  var e = hi.get(t.nodeName);
  if (e) return e;
  hi.set(t.nodeName, e = []);
  for (var i, r = t, n = Element.prototype; n !== r; ) {
    i = gr(r);
    for (var o in i)
      i[o].set && e.push(o);
    r = yi(r);
  }
  return e;
}
function bi(t, e) {
  return t === e || (t == null ? void 0 : t[ct]) === e;
}
function Ut(t = {}, e, i, r) {
  return ti(() => {
    var n, o;
    return Wi(() => {
      n = o, o = [], tt(() => {
        t !== i(...o) && (e(t, ...o), n && bi(i(...n), t) && e(null, ...n));
      });
    }), () => {
      Xt(() => {
        o && bi(i(...o), t) && e(null, ...o);
      });
    };
  }), t;
}
function tr(t) {
  z === null && ji(), Zr(() => {
    const e = tt(t);
    if (typeof e == "function") return (
      /** @type {() => void} */
      e
    );
  });
}
function _n(t) {
  z === null && ji(), tr(() => () => tt(t));
}
function xn(t, e, i) {
  if (t == null)
    return e(void 0), dt;
  const r = tt(
    () => t.subscribe(
      e,
      // @ts-expect-error
      i
    )
  );
  return r.unsubscribe ? () => r.unsubscribe() : r;
}
const ze = [];
function ir(t, e = dt) {
  let i = null;
  const r = /* @__PURE__ */ new Set();
  function n(h) {
    if (Si(t, h) && (t = h, i)) {
      const f = !ze.length;
      for (const d of r)
        d[1](), ze.push(d, t);
      if (f) {
        for (let d = 0; d < ze.length; d += 2)
          ze[d][0](ze[d + 1]);
        ze.length = 0;
      }
    }
  }
  function o(h) {
    n(h(
      /** @type {T} */
      t
    ));
  }
  function c(h, f = dt) {
    const d = [h, f];
    return r.add(d), r.size === 1 && (i = e(n, o) || dt), h(
      /** @type {T} */
      t
    ), () => {
      r.delete(d), r.size === 0 && i && (i(), i = null);
    };
  }
  return { set: n, update: o, subscribe: c };
}
function rr(t) {
  let e;
  return xn(t, (i) => e = i)(), e;
}
function ut(t, e, i, r) {
  var n;
  n = /** @type {V} */
  t[e];
  var o = (
    /** @type {V} */
    r
  ), c = true, h = false, f = () => (h = true, c && (c = false, o = /** @type {V} */
  r), o), d;
  d = () => {
    var u = (
      /** @type {V} */
      t[e]
    );
    return u === void 0 ? f() : (c = true, h = false, u);
  };
  var v = false, w = /* @__PURE__ */ Di(n), s = /* @__PURE__ */ Ri(() => {
    var u = d(), a = U(w);
    return v ? (v = false, a) : w.v = u;
  });
  return function(u, a) {
    if (arguments.length > 0) {
      const l = a ? U(s) : u;
      return s.equals(l) || (v = true, K(w, l), h && o !== void 0 && (o = l), tt(() => U(s))), u;
    }
    return U(s);
  };
}
function yn(t) {
  return new Cn(t);
}
class Cn {
  /**
   * @param {ComponentConstructorOptions & {
   *  component: any;
   * }} options
   */
  constructor(e) {
    /** @type {any} */
    __privateAdd(this, _t2);
    /** @type {Record<string, any>} */
    __privateAdd(this, _e2);
    var _a2;
    var i = /* @__PURE__ */ new Map(), r = (o, c) => {
      var h = /* @__PURE__ */ Di(c);
      return i.set(o, h), h;
    };
    const n = new Proxy(
      { ...e.props || {}, $$events: {} },
      {
        get(o, c) {
          return U(i.get(c) ?? r(c, Reflect.get(o, c)));
        },
        has(o, c) {
          return c === vr ? true : (U(i.get(c) ?? r(c, Reflect.get(o, c))), Reflect.has(o, c));
        },
        set(o, c, h) {
          return K(i.get(c) ?? r(c, h), h), Reflect.set(o, c, h);
        }
      }
    );
    __privateSet(this, _e2, (e.hydrate ? bn : Ji)(e.component, {
      target: e.target,
      anchor: e.anchor,
      props: n,
      context: e.context,
      intro: e.intro ?? false,
      recover: e.recover
    })), (!((_a2 = e == null ? void 0 : e.props) == null ? void 0 : _a2.$$host) || e.sync === false) && Ge(), __privateSet(this, _t2, n.$$events);
    for (const o of Object.keys(__privateGet(this, _e2)))
      o === "$set" || o === "$destroy" || o === "$on" || gt(this, o, {
        get() {
          return __privateGet(this, _e2)[o];
        },
        /** @param {any} value */
        set(c) {
          __privateGet(this, _e2)[o] = c;
        },
        enumerable: true
      });
    __privateGet(this, _e2).$set = /** @param {Record<string, any>} next */
    (o) => {
      Object.assign(n, o);
    }, __privateGet(this, _e2).$destroy = () => {
      pn(__privateGet(this, _e2));
    };
  }
  /** @param {Record<string, any>} props */
  $set(e) {
    __privateGet(this, _e2).$set(e);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => any} callback
   * @returns {any}
   */
  $on(e, i) {
    __privateGet(this, _t2)[e] = __privateGet(this, _t2)[e] || [];
    const r = (...n) => i.call(this, ...n);
    return __privateGet(this, _t2)[e].push(r), () => {
      __privateGet(this, _t2)[e] = __privateGet(this, _t2)[e].filter(
        /** @param {any} fn */
        (n) => n !== r
      );
    };
  }
  $destroy() {
    __privateGet(this, _e2).$destroy();
  }
}
_t2 = new WeakMap();
_e2 = new WeakMap();
let nr;
typeof HTMLElement == "function" && (nr = class extends HTMLElement {
  /**
   * @param {*} $$componentCtor
   * @param {*} $$slots
   * @param {*} use_shadow_dom
   */
  constructor(t, e, i) {
    super();
    /** The Svelte component constructor */
    __publicField(this, "$$ctor");
    /** Slots */
    __publicField(this, "$$s");
    /** @type {any} The Svelte component instance */
    __publicField(this, "$$c");
    /** Whether or not the custom element is connected */
    __publicField(this, "$$cn", false);
    /** @type {Record<string, any>} Component props data */
    __publicField(this, "$$d", {});
    /** `true` if currently in the process of reflecting component props back to attributes */
    __publicField(this, "$$r", false);
    /** @type {Record<string, CustomElementPropDefinition>} Props definition (name, reflected, type etc) */
    __publicField(this, "$$p_d", {});
    /** @type {Record<string, EventListenerOrEventListenerObject[]>} Event listeners */
    __publicField(this, "$$l", {});
    /** @type {Map<EventListenerOrEventListenerObject, Function>} Event listener unsubscribe functions */
    __publicField(this, "$$l_u", /* @__PURE__ */ new Map());
    /** @type {any} The managed render effect for reflecting attributes */
    __publicField(this, "$$me");
    this.$$ctor = t, this.$$s = e, i && this.attachShadow({ mode: "open" });
  }
  /**
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} listener
   * @param {boolean | AddEventListenerOptions} [options]
   */
  addEventListener(t, e, i) {
    if (this.$$l[t] = this.$$l[t] || [], this.$$l[t].push(e), this.$$c) {
      const r = this.$$c.$on(t, e);
      this.$$l_u.set(e, r);
    }
    super.addEventListener(t, e, i);
  }
  /**
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} listener
   * @param {boolean | AddEventListenerOptions} [options]
   */
  removeEventListener(t, e, i) {
    if (super.removeEventListener(t, e, i), this.$$c) {
      const r = this.$$l_u.get(e);
      r && (r(), this.$$l_u.delete(e));
    }
  }
  async connectedCallback() {
    if (this.$$cn = true, !this.$$c) {
      let t = function(r) {
        return (n) => {
          const o = document.createElement("slot");
          r !== "default" && (o.name = r), Qi(n, o);
        };
      };
      if (await Promise.resolve(), !this.$$cn || this.$$c)
        return;
      const e = {}, i = En(this);
      for (const r of this.$$s)
        r in i && (r === "default" && !this.$$d.children ? (this.$$d.children = t(r), e.default = true) : e[r] = t(r));
      for (const r of this.attributes) {
        const n = this.$$g_p(r.name);
        n in this.$$d || (this.$$d[n] = bt(n, r.value, this.$$p_d, "toProp"));
      }
      for (const r in this.$$p_d)
        !(r in this.$$d) && this[r] !== void 0 && (this.$$d[r] = this[r], delete this[r]);
      this.$$c = yn({
        component: this.$$ctor,
        target: this.shadowRoot || this,
        props: {
          ...this.$$d,
          $$slots: e,
          $$host: this
        }
      }), this.$$me = Qr(() => {
        Wi(() => {
          var _a2;
          this.$$r = true;
          for (const r of mt(this.$$c)) {
            if (!((_a2 = this.$$p_d[r]) == null ? void 0 : _a2.reflect)) continue;
            this.$$d[r] = this.$$c[r];
            const n = bt(
              r,
              this.$$d[r],
              this.$$p_d,
              "toAttribute"
            );
            n == null ? this.removeAttribute(this.$$p_d[r].attribute || r) : this.setAttribute(this.$$p_d[r].attribute || r, n);
          }
          this.$$r = false;
        });
      });
      for (const r in this.$$l)
        for (const n of this.$$l[r]) {
          const o = this.$$c.$on(r, n);
          this.$$l_u.set(n, o);
        }
      this.$$l = {};
    }
  }
  // We don't need this when working within Svelte code, but for compatibility of people using this outside of Svelte
  // and setting attributes through setAttribute etc, this is helpful
  /**
   * @param {string} attr
   * @param {string} _oldValue
   * @param {string} newValue
   */
  attributeChangedCallback(t, e, i) {
    var _a2;
    this.$$r || (t = this.$$g_p(t), this.$$d[t] = bt(t, i, this.$$p_d, "toProp"), (_a2 = this.$$c) == null ? void 0 : _a2.$set({ [t]: this.$$d[t] }));
  }
  disconnectedCallback() {
    this.$$cn = false, Promise.resolve().then(() => {
      !this.$$cn && this.$$c && (this.$$c.$destroy(), this.$$me(), this.$$c = void 0);
    });
  }
  /**
   * @param {string} attribute_name
   */
  $$g_p(t) {
    return mt(this.$$p_d).find(
      (e) => this.$$p_d[e].attribute === t || !this.$$p_d[e].attribute && e.toLowerCase() === t
    ) || t;
  }
});
function bt(t, e, i, r) {
  var _a2;
  const n = (_a2 = i[t]) == null ? void 0 : _a2.type;
  if (e = n === "Boolean" && typeof e != "boolean" ? e != null : e, !r || !i[t])
    return e;
  if (r === "toAttribute")
    switch (n) {
      case "Object":
      case "Array":
        return e == null ? null : JSON.stringify(e);
      case "Boolean":
        return e ? "" : null;
      case "Number":
        return e ?? null;
      default:
        return e;
    }
  else
    switch (n) {
      case "Object":
      case "Array":
        return e && JSON.parse(e);
      case "Boolean":
        return e;
      // conversion already handled above
      case "Number":
        return e != null ? +e : e;
      default:
        return e;
    }
}
function En(t) {
  const e = {};
  return t.childNodes.forEach((i) => {
    e[
      /** @type {Element} node */
      i.slot || "default"
    ] = true;
  }), e;
}
function kn(t, e, i, r, n, o) {
  let c = class extends nr {
    constructor() {
      super(t, i, n), this.$$p_d = e;
    }
    static get observedAttributes() {
      return mt(e).map(
        (h) => (e[h].attribute || h).toLowerCase()
      );
    }
  };
  return mt(e).forEach((h) => {
    gt(c.prototype, h, {
      get() {
        return this.$$c && h in this.$$c ? this.$$c[h] : this.$$d[h];
      },
      set(f) {
        var _a2;
        f = bt(h, f, e), this.$$d[h] = f;
        var d = this.$$c;
        if (d) {
          var v = (_a2 = We(d, h)) == null ? void 0 : _a2.get;
          v ? d[h] = f : d.$set({ [h]: f });
        }
      }
    });
  }), r.forEach((h) => {
    gt(c.prototype, h, {
      get() {
        var _a2;
        return (_a2 = this.$$c) == null ? void 0 : _a2[h];
      }
    });
  }), o && (c = o(c)), t.element = /** @type {any} */
  c, c;
}
class Sn {
  constructor() {
    __publicField(this, "verbose", false);
  }
  info(e) {
    this.verbose && console.log(e);
  }
  error(e, i) {
    this.verbose && console.error(e, i);
  }
}
const N = new Sn();
function Dn(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var Xe = { exports: {} }, Tn = Xe.exports, pi;
function Rn() {
  return pi || (pi = 1, (function(t, e) {
    (function(i, r) {
      var n = "1.0.41", o = "", c = "?", h = "function", f = "undefined", d = "object", v = "string", w = "major", s = "model", u = "name", a = "type", l = "vendor", p = "version", O = "architecture", A = "console", g = "mobile", _ = "tablet", M = "smarttv", F = "wearable", G = "embedded", Se = 500, De = "Amazon", de = "Apple", it = "ASUS", oe = "BlackBerry", Te = "Browser", Re = "Chrome", Ot = "Edge", $e = "Firefox", xe = "Google", rt = "Honor", nt = "Huawei", At = "Lenovo", Oe = "LG", Ae = "Microsoft", Le = "Motorola", Me = "Nvidia", st = "OnePlus", fe = "Opera", Fe = "OPPO", he = "Samsung", ye = "Sharp", Y = "Sony", Ne = "Xiaomi", Ce = "Zebra", H = "Facebook", b = "Chromium OS", C = "Mac OS", L = " Browser", S = function(y, E) {
        var x = {};
        for (var T in y)
          E[T] && E[T].length % 2 === 0 ? x[T] = E[T].concat(y[T]) : x[T] = y[T];
        return x;
      }, $ = function(y) {
        for (var E = {}, x = 0; x < y.length; x++)
          E[y[x].toUpperCase()] = y[x];
        return E;
      }, ee = function(y, E) {
        return typeof y === v ? qe(E).indexOf(qe(y)) !== -1 : false;
      }, qe = function(y) {
        return y.toLowerCase();
      }, lr = function(y) {
        return typeof y === v ? y.replace(/[^\d\.]/g, o).split(".")[0] : r;
      }, Lt = function(y, E) {
        if (typeof y === v)
          return y = y.replace(/^\s\s*/, o), typeof E === f ? y : y.substring(0, Se);
      }, He = function(y, E) {
        for (var x = 0, T, ae, te, k, m, ie; x < E.length && !m; ) {
          var Mt = E[x], ni = E[x + 1];
          for (T = ae = 0; T < Mt.length && !m && Mt[T]; )
            if (m = Mt[T++].exec(y), m)
              for (te = 0; te < ni.length; te++)
                ie = m[++ae], k = ni[te], typeof k === d && k.length > 0 ? k.length === 2 ? typeof k[1] == h ? this[k[0]] = k[1].call(this, ie) : this[k[0]] = k[1] : k.length === 3 ? typeof k[1] === h && !(k[1].exec && k[1].test) ? this[k[0]] = ie ? k[1].call(this, ie, k[2]) : r : this[k[0]] = ie ? ie.replace(k[1], k[2]) : r : k.length === 4 && (this[k[0]] = ie ? k[3].call(this, ie.replace(k[1], k[2])) : r) : this[k] = ie || r;
          x += 2;
        }
      }, je = function(y, E) {
        for (var x in E)
          if (typeof E[x] === d && E[x].length > 0) {
            for (var T = 0; T < E[x].length; T++)
              if (ee(E[x][T], y))
                return x === c ? r : x;
          } else if (ee(E[x], y))
            return x === c ? r : x;
        return E.hasOwnProperty("*") ? E["*"] : y;
      }, ur = {
        "1.0": "/8",
        "1.2": "/1",
        "1.3": "/3",
        "2.0": "/412",
        "2.0.2": "/416",
        "2.0.3": "/417",
        "2.0.4": "/419",
        "?": "/"
      }, ii = {
        ME: "4.90",
        "NT 3.11": "NT3.51",
        "NT 4.0": "NT4.0",
        2e3: "NT 5.0",
        XP: ["NT 5.1", "NT 5.2"],
        Vista: "NT 6.0",
        7: "NT 6.1",
        8: "NT 6.2",
        "8.1": "NT 6.3",
        10: ["NT 6.4", "NT 10.0"],
        RT: "ARM"
      }, ri = {
        browser: [
          [
            /\b(?:crmo|crios)\/([\w\.]+)/i
            // Chrome for Android/iOS
          ],
          [p, [u, "Chrome"]],
          [
            /edg(?:e|ios|a)?\/([\w\.]+)/i
            // Microsoft Edge
          ],
          [p, [u, "Edge"]],
          [
            // Presto based
            /(opera mini)\/([-\w\.]+)/i,
            // Opera Mini
            /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i,
            // Opera Mobi/Tablet
            /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i
            // Opera
          ],
          [u, p],
          [
            /opios[\/ ]+([\w\.]+)/i
            // Opera mini on iphone >= 8.0
          ],
          [p, [u, fe + " Mini"]],
          [
            /\bop(?:rg)?x\/([\w\.]+)/i
            // Opera GX
          ],
          [p, [u, fe + " GX"]],
          [
            /\bopr\/([\w\.]+)/i
            // Opera Webkit
          ],
          [p, [u, fe]],
          [
            // Mixed
            /\bb[ai]*d(?:uhd|[ub]*[aekoprswx]{5,6})[\/ ]?([\w\.]+)/i
            // Baidu
          ],
          [p, [u, "Baidu"]],
          [
            /\b(?:mxbrowser|mxios|myie2)\/?([-\w\.]*)\b/i
            // Maxthon
          ],
          [p, [u, "Maxthon"]],
          [
            /(kindle)\/([\w\.]+)/i,
            // Kindle
            /(lunascape|maxthon|netfront|jasmine|blazer|sleipnir)[\/ ]?([\w\.]*)/i,
            // Lunascape/Maxthon/Netfront/Jasmine/Blazer/Sleipnir
            // Trident based
            /(avant|iemobile|slim(?:browser|boat|jet))[\/ ]?([\d\.]*)/i,
            // Avant/IEMobile/SlimBrowser/SlimBoat/Slimjet
            /(?:ms|\()(ie) ([\w\.]+)/i,
            // Internet Explorer
            // Blink/Webkit/KHTML based                                         // Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser/QupZilla/Falkon
            /(flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|duckduckgo|klar|helio|(?=comodo_)?dragon)\/([-\w\.]+)/i,
            // Rekonq/Puffin/Brave/Whale/QQBrowserLite/QQ//Vivaldi/DuckDuckGo/Klar/Helio/Dragon
            /(heytap|ovi|115)browser\/([\d\.]+)/i,
            // HeyTap/Ovi/115
            /(weibo)__([\d\.]+)/i
            // Weibo
          ],
          [u, p],
          [
            /quark(?:pc)?\/([-\w\.]+)/i
            // Quark
          ],
          [p, [u, "Quark"]],
          [
            /\bddg\/([\w\.]+)/i
            // DuckDuckGo
          ],
          [p, [u, "DuckDuckGo"]],
          [
            /(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i
            // UCBrowser
          ],
          [p, [u, "UC" + Te]],
          [
            /microm.+\bqbcore\/([\w\.]+)/i,
            // WeChat Desktop for Windows Built-in Browser
            /\bqbcore\/([\w\.]+).+microm/i,
            /micromessenger\/([\w\.]+)/i
            // WeChat
          ],
          [p, [u, "WeChat"]],
          [
            /konqueror\/([\w\.]+)/i
            // Konqueror
          ],
          [p, [u, "Konqueror"]],
          [
            /trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i
            // IE11
          ],
          [p, [u, "IE"]],
          [
            /ya(?:search)?browser\/([\w\.]+)/i
            // Yandex
          ],
          [p, [u, "Yandex"]],
          [
            /slbrowser\/([\w\.]+)/i
            // Smart Lenovo Browser
          ],
          [p, [u, "Smart Lenovo " + Te]],
          [
            /(avast|avg)\/([\w\.]+)/i
            // Avast/AVG Secure Browser
          ],
          [[u, /(.+)/, "$1 Secure " + Te], p],
          [
            /\bfocus\/([\w\.]+)/i
            // Firefox Focus
          ],
          [p, [u, $e + " Focus"]],
          [
            /\bopt\/([\w\.]+)/i
            // Opera Touch
          ],
          [p, [u, fe + " Touch"]],
          [
            /coc_coc\w+\/([\w\.]+)/i
            // Coc Coc Browser
          ],
          [p, [u, "Coc Coc"]],
          [
            /dolfin\/([\w\.]+)/i
            // Dolphin
          ],
          [p, [u, "Dolphin"]],
          [
            /coast\/([\w\.]+)/i
            // Opera Coast
          ],
          [p, [u, fe + " Coast"]],
          [
            /miuibrowser\/([\w\.]+)/i
            // MIUI Browser
          ],
          [p, [u, "MIUI" + L]],
          [
            /fxios\/([\w\.-]+)/i
            // Firefox for iOS
          ],
          [p, [u, $e]],
          [
            /\bqihoobrowser\/?([\w\.]*)/i
            // 360
          ],
          [p, [u, "360"]],
          [
            /\b(qq)\/([\w\.]+)/i
            // QQ
          ],
          [[u, /(.+)/, "$1Browser"], p],
          [
            /(oculus|sailfish|huawei|vivo|pico)browser\/([\w\.]+)/i
          ],
          [[u, /(.+)/, "$1" + L], p],
          [
            // Oculus/Sailfish/HuaweiBrowser/VivoBrowser/PicoBrowser
            /samsungbrowser\/([\w\.]+)/i
            // Samsung Internet
          ],
          [p, [u, he + " Internet"]],
          [
            /metasr[\/ ]?([\d\.]+)/i
            // Sogou Explorer
          ],
          [p, [u, "Sogou Explorer"]],
          [
            /(sogou)mo\w+\/([\d\.]+)/i
            // Sogou Mobile
          ],
          [[u, "Sogou Mobile"], p],
          [
            /(electron)\/([\w\.]+) safari/i,
            // Electron-based App
            /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i,
            // Tesla
            /m?(qqbrowser|2345(?=browser|chrome|explorer))\w*[\/ ]?v?([\w\.]+)/i
            // QQ/2345
          ],
          [u, p],
          [
            /(lbbrowser|rekonq)/i,
            // LieBao Browser/Rekonq
            /\[(linkedin)app\]/i
            // LinkedIn App for iOS & Android
          ],
          [u],
          [
            /ome\/([\w\.]+) \w* ?(iron) saf/i,
            // Iron
            /ome\/([\w\.]+).+qihu (360)[es]e/i
            // 360
          ],
          [p, u],
          [
            // WebView
            /((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i
            // Facebook App for iOS & Android
          ],
          [[u, H], p],
          [
            /(Klarna)\/([\w\.]+)/i,
            // Klarna Shopping Browser for iOS & Android
            /(kakao(?:talk|story))[\/ ]([\w\.]+)/i,
            // Kakao App
            /(naver)\(.*?(\d+\.[\w\.]+).*\)/i,
            // Naver InApp
            /(daum)apps[\/ ]([\w\.]+)/i,
            // Daum App
            /safari (line)\/([\w\.]+)/i,
            // Line App for iOS
            /\b(line)\/([\w\.]+)\/iab/i,
            // Line App for Android
            /(alipay)client\/([\w\.]+)/i,
            // Alipay
            /(twitter)(?:and| f.+e\/([\w\.]+))/i,
            // Twitter
            /(chromium|instagram|snapchat)[\/ ]([-\w\.]+)/i
            // Chromium/Instagram/Snapchat
          ],
          [u, p],
          [
            /\bgsa\/([\w\.]+) .*safari\//i
            // Google Search Appliance on iOS
          ],
          [p, [u, "GSA"]],
          [
            /musical_ly(?:.+app_?version\/|_)([\w\.]+)/i
            // TikTok
          ],
          [p, [u, "TikTok"]],
          [
            /headlesschrome(?:\/([\w\.]+)| )/i
            // Chrome Headless
          ],
          [p, [u, Re + " Headless"]],
          [
            / wv\).+(chrome)\/([\w\.]+)/i
            // Chrome WebView
          ],
          [[u, Re + " WebView"], p],
          [
            /droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i
            // Android Browser
          ],
          [p, [u, "Android " + Te]],
          [
            /(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i
            // Chrome/OmniWeb/Arora/Tizen/Nokia
          ],
          [u, p],
          [
            /version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i
            // Mobile Safari
          ],
          [p, [u, "Mobile Safari"]],
          [
            /version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i
            // Safari & Safari Mobile
          ],
          [p, u],
          [
            /webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i
            // Safari < 3.0
          ],
          [u, [p, je, ur]],
          [
            /(webkit|khtml)\/([\w\.]+)/i
          ],
          [u, p],
          [
            // Gecko based
            /(navigator|netscape\d?)\/([-\w\.]+)/i
            // Netscape
          ],
          [[u, "Netscape"], p],
          [
            /(wolvic|librewolf)\/([\w\.]+)/i
            // Wolvic/LibreWolf
          ],
          [u, p],
          [
            /mobile vr; rv:([\w\.]+)\).+firefox/i
            // Firefox Reality
          ],
          [p, [u, $e + " Reality"]],
          [
            /ekiohf.+(flow)\/([\w\.]+)/i,
            // Flow
            /(swiftfox)/i,
            // Swiftfox
            /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror)[\/ ]?([\w\.\+]+)/i,
            // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
            /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i,
            // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
            /(firefox)\/([\w\.]+)/i,
            // Other Firefox-based
            /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i,
            // Mozilla
            // Other
            /(amaya|dillo|doris|icab|ladybird|lynx|mosaic|netsurf|obigo|polaris|w3m|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i,
            // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Obigo/Mosaic/Go/ICE/UP.Browser/Ladybird
            /\b(links) \(([\w\.]+)/i
            // Links
          ],
          [u, [p, /_/g, "."]],
          [
            /(cobalt)\/([\w\.]+)/i
            // Cobalt
          ],
          [u, [p, /master.|lts./, ""]]
        ],
        cpu: [
          [
            /\b((amd|x|x86[-_]?|wow|win)64)\b/i
            // AMD64 (x64)
          ],
          [[O, "amd64"]],
          [
            /(ia32(?=;))/i,
            // IA32 (quicktime)
            /\b((i[346]|x)86)(pc)?\b/i
            // IA32 (x86)
          ],
          [[O, "ia32"]],
          [
            /\b(aarch64|arm(v?[89]e?l?|_?64))\b/i
            // ARM64
          ],
          [[O, "arm64"]],
          [
            /\b(arm(v[67])?ht?n?[fl]p?)\b/i
            // ARMHF
          ],
          [[O, "armhf"]],
          [
            // PocketPC mistakenly identified as PowerPC
            /( (ce|mobile); ppc;|\/[\w\.]+arm\b)/i
          ],
          [[O, "arm"]],
          [
            /((ppc|powerpc)(64)?)( mac|;|\))/i
            // PowerPC
          ],
          [[O, /ower/, o, qe]],
          [
            / sun4\w[;\)]/i
            // SPARC
          ],
          [[O, "sparc"]],
          [
            /\b(avr32|ia64(?=;)|68k(?=\))|\barm(?=v([1-7]|[5-7]1)l?|;|eabi)|(irix|mips|sparc)(64)?\b|pa-risc)/i
            // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
          ],
          [[O, qe]]
        ],
        device: [
          [
            //////////////////////////
            // MOBILES & TABLETS
            /////////////////////////
            // Samsung
            /\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i
          ],
          [s, [l, he], [a, _]],
          [
            /\b((?:s[cgp]h|gt|sm)-(?![lr])\w+|sc[g-]?[\d]+a?|galaxy nexus)/i,
            /samsung[- ]((?!sm-[lr])[-\w]+)/i,
            /sec-(sgh\w+)/i
          ],
          [s, [l, he], [a, g]],
          [
            // Apple
            /(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i
            // iPod/iPhone
          ],
          [s, [l, de], [a, g]],
          [
            /\((ipad);[-\w\),; ]+apple/i,
            // iPad
            /applecoremedia\/[\w\.]+ \((ipad)/i,
            /\b(ipad)\d\d?,\d\d?[;\]].+ios/i
          ],
          [s, [l, de], [a, _]],
          [
            /(macintosh);/i
          ],
          [s, [l, de]],
          [
            // Sharp
            /\b(sh-?[altvz]?\d\d[a-ekm]?)/i
          ],
          [s, [l, ye], [a, g]],
          [
            // Honor
            /\b((?:brt|eln|hey2?|gdi|jdn)-a?[lnw]09|(?:ag[rm]3?|jdn2|kob2)-a?[lw]0[09]hn)(?: bui|\)|;)/i
          ],
          [s, [l, rt], [a, _]],
          [
            /honor([-\w ]+)[;\)]/i
          ],
          [s, [l, rt], [a, g]],
          [
            // Huawei
            /\b((?:ag[rs][2356]?k?|bah[234]?|bg[2o]|bt[kv]|cmr|cpn|db[ry]2?|jdn2|got|kob2?k?|mon|pce|scm|sht?|[tw]gr|vrd)-[ad]?[lw][0125][09]b?|605hw|bg2-u03|(?:gem|fdr|m2|ple|t1)-[7a]0[1-4][lu]|t1-a2[13][lw]|mediapad[\w\. ]*(?= bui|\)))\b(?!.+d\/s)/i
          ],
          [s, [l, nt], [a, _]],
          [
            /(?:huawei)([-\w ]+)[;\)]/i,
            /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i
          ],
          [s, [l, nt], [a, g]],
          [
            // Xiaomi
            /oid[^\)]+; (2[\dbc]{4}(182|283|rp\w{2})[cgl]|m2105k81a?c)(?: bui|\))/i,
            /\b((?:red)?mi[-_ ]?pad[\w- ]*)(?: bui|\))/i
            // Mi Pad tablets
          ],
          [[s, /_/g, " "], [l, Ne], [a, _]],
          [
            /\b(poco[\w ]+|m2\d{3}j\d\d[a-z]{2})(?: bui|\))/i,
            // Xiaomi POCO
            /\b; (\w+) build\/hm\1/i,
            // Xiaomi Hongmi 'numeric' models
            /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i,
            // Xiaomi Hongmi
            /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i,
            // Xiaomi Redmi
            /oid[^\)]+; (m?[12][0-389][01]\w{3,6}[c-y])( bui|; wv|\))/i,
            // Xiaomi Redmi 'numeric' models
            /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite|pro)?)(?: bui|\))/i,
            // Xiaomi Mi
            / ([\w ]+) miui\/v?\d/i
          ],
          [[s, /_/g, " "], [l, Ne], [a, g]],
          [
            // OPPO
            /; (\w+) bui.+ oppo/i,
            /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i
          ],
          [s, [l, Fe], [a, g]],
          [
            /\b(opd2(\d{3}a?))(?: bui|\))/i
          ],
          [s, [l, je, { OnePlus: ["304", "403", "203"], "*": Fe }], [a, _]],
          [
            // Vivo
            /vivo (\w+)(?: bui|\))/i,
            /\b(v[12]\d{3}\w?[at])(?: bui|;)/i
          ],
          [s, [l, "Vivo"], [a, g]],
          [
            // Realme
            /\b(rmx[1-3]\d{3})(?: bui|;|\))/i
          ],
          [s, [l, "Realme"], [a, g]],
          [
            // Motorola
            /\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i,
            /\bmot(?:orola)?[- ](\w*)/i,
            /((?:moto(?! 360)[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i
          ],
          [s, [l, Le], [a, g]],
          [
            /\b(mz60\d|xoom[2 ]{0,2}) build\//i
          ],
          [s, [l, Le], [a, _]],
          [
            // LG
            /((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i
          ],
          [s, [l, Oe], [a, _]],
          [
            /(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i,
            /\blg[-e;\/ ]+((?!browser|netcast|android tv|watch)\w+)/i,
            /\blg-?([\d\w]+) bui/i
          ],
          [s, [l, Oe], [a, g]],
          [
            // Lenovo
            /(ideatab[-\w ]+|602lv|d-42a|a101lv|a2109a|a3500-hv|s[56]000|pb-6505[my]|tb-?x?\d{3,4}(?:f[cu]|xu|[av])|yt\d?-[jx]?\d+[lfmx])( bui|;|\)|\/)/i,
            /lenovo ?(b[68]0[08]0-?[hf]?|tab(?:[\w- ]+?)|tb[\w-]{6,7})( bui|;|\)|\/)/i
          ],
          [s, [l, At], [a, _]],
          [
            // Nokia
            /(nokia) (t[12][01])/i
          ],
          [l, s, [a, _]],
          [
            /(?:maemo|nokia).*(n900|lumia \d+|rm-\d+)/i,
            /nokia[-_ ]?(([-\w\. ]*))/i
          ],
          [[s, /_/g, " "], [a, g], [l, "Nokia"]],
          [
            // Google
            /(pixel (c|tablet))\b/i
            // Google Pixel C/Tablet
          ],
          [s, [l, xe], [a, _]],
          [
            /droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i
            // Google Pixel
          ],
          [s, [l, xe], [a, g]],
          [
            // Sony
            /droid.+; (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i
          ],
          [s, [l, Y], [a, g]],
          [
            /sony tablet [ps]/i,
            /\b(?:sony)?sgp\w+(?: bui|\))/i
          ],
          [[s, "Xperia Tablet"], [l, Y], [a, _]],
          [
            // OnePlus
            / (kb2005|in20[12]5|be20[12][59])\b/i,
            /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i
          ],
          [s, [l, st], [a, g]],
          [
            // Amazon
            /(alexa)webm/i,
            /(kf[a-z]{2}wi|aeo(?!bc)\w\w)( bui|\))/i,
            // Kindle Fire without Silk / Echo Show
            /(kf[a-z]+)( bui|\)).+silk\//i
            // Kindle Fire HD
          ],
          [s, [l, De], [a, _]],
          [
            /((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i
            // Fire Phone
          ],
          [[s, /(.+)/g, "Fire Phone $1"], [l, De], [a, g]],
          [
            // BlackBerry
            /(playbook);[-\w\),; ]+(rim)/i
            // BlackBerry PlayBook
          ],
          [s, l, [a, _]],
          [
            /\b((?:bb[a-f]|st[hv])100-\d)/i,
            /\(bb10; (\w+)/i
            // BlackBerry 10
          ],
          [s, [l, oe], [a, g]],
          [
            // Asus
            /(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i
          ],
          [s, [l, it], [a, _]],
          [
            / (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i
          ],
          [s, [l, it], [a, g]],
          [
            // HTC
            /(nexus 9)/i
            // HTC Nexus 9
          ],
          [s, [l, "HTC"], [a, _]],
          [
            /(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i,
            // HTC
            // ZTE
            /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i,
            /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i
            // Alcatel/GeeksPhone/Nexian/Panasonic/Sony
          ],
          [l, [s, /_/g, " "], [a, g]],
          [
            // TCL
            /droid [\w\.]+; ((?:8[14]9[16]|9(?:0(?:48|60|8[01])|1(?:3[27]|66)|2(?:6[69]|9[56])|466))[gqswx])\w*(\)| bui)/i
          ],
          [s, [l, "TCL"], [a, _]],
          [
            // itel
            /(itel) ((\w+))/i
          ],
          [[l, qe], s, [a, je, { tablet: ["p10001l", "w7001"], "*": "mobile" }]],
          [
            // Acer
            /droid.+; ([ab][1-7]-?[0178a]\d\d?)/i
          ],
          [s, [l, "Acer"], [a, _]],
          [
            // Meizu
            /droid.+; (m[1-5] note) bui/i,
            /\bmz-([-\w]{2,})/i
          ],
          [s, [l, "Meizu"], [a, g]],
          [
            // Ulefone
            /; ((?:power )?armor(?:[\w ]{0,8}))(?: bui|\))/i
          ],
          [s, [l, "Ulefone"], [a, g]],
          [
            // Energizer
            /; (energy ?\w+)(?: bui|\))/i,
            /; energizer ([\w ]+)(?: bui|\))/i
          ],
          [s, [l, "Energizer"], [a, g]],
          [
            // Cat
            /; cat (b35);/i,
            /; (b15q?|s22 flip|s48c|s62 pro)(?: bui|\))/i
          ],
          [s, [l, "Cat"], [a, g]],
          [
            // Smartfren
            /((?:new )?andromax[\w- ]+)(?: bui|\))/i
          ],
          [s, [l, "Smartfren"], [a, g]],
          [
            // Nothing
            /droid.+; (a(?:015|06[35]|142p?))/i
          ],
          [s, [l, "Nothing"], [a, g]],
          [
            // Archos
            /; (x67 5g|tikeasy \w+|ac[1789]\d\w+)( b|\))/i,
            /archos ?(5|gamepad2?|([\w ]*[t1789]|hello) ?\d+[\w ]*)( b|\))/i
          ],
          [s, [l, "Archos"], [a, _]],
          [
            /archos ([\w ]+)( b|\))/i,
            /; (ac[3-6]\d\w{2,8})( b|\))/i
          ],
          [s, [l, "Archos"], [a, g]],
          [
            // MIXED
            /(imo) (tab \w+)/i,
            // IMO
            /(infinix) (x1101b?)/i
            // Infinix XPad
          ],
          [l, s, [a, _]],
          [
            /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus(?! zenw)|dell|jolla|meizu|motorola|polytron|infinix|tecno|micromax|advan)[-_ ]?([-\w]*)/i,
            // BlackBerry/BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron/Infinix/Tecno/Micromax/Advan
            /; (hmd|imo) ([\w ]+?)(?: bui|\))/i,
            // HMD/IMO
            /(hp) ([\w ]+\w)/i,
            // HP iPAQ
            /(microsoft); (lumia[\w ]+)/i,
            // Microsoft Lumia
            /(lenovo)[-_ ]?([-\w ]+?)(?: bui|\)|\/)/i,
            // Lenovo
            /(oppo) ?([\w ]+) bui/i
            // OPPO
          ],
          [l, s, [a, g]],
          [
            /(kobo)\s(ereader|touch)/i,
            // Kobo
            /(hp).+(touchpad(?!.+tablet)|tablet)/i,
            // HP TouchPad
            /(kindle)\/([\w\.]+)/i,
            // Kindle
            /(nook)[\w ]+build\/(\w+)/i,
            // Nook
            /(dell) (strea[kpr\d ]*[\dko])/i,
            // Dell Streak
            /(le[- ]+pan)[- ]+(\w{1,9}) bui/i,
            // Le Pan Tablets
            /(trinity)[- ]*(t\d{3}) bui/i,
            // Trinity Tablets
            /(gigaset)[- ]+(q\w{1,9}) bui/i,
            // Gigaset Tablets
            /(vodafone) ([\w ]+)(?:\)| bui)/i
            // Vodafone
          ],
          [l, s, [a, _]],
          [
            /(surface duo)/i
            // Surface Duo
          ],
          [s, [l, Ae], [a, _]],
          [
            /droid [\d\.]+; (fp\du?)(?: b|\))/i
            // Fairphone
          ],
          [s, [l, "Fairphone"], [a, g]],
          [
            /(u304aa)/i
            // AT&T
          ],
          [s, [l, "AT&T"], [a, g]],
          [
            /\bsie-(\w*)/i
            // Siemens
          ],
          [s, [l, "Siemens"], [a, g]],
          [
            /\b(rct\w+) b/i
            // RCA Tablets
          ],
          [s, [l, "RCA"], [a, _]],
          [
            /\b(venue[\d ]{2,7}) b/i
            // Dell Venue Tablets
          ],
          [s, [l, "Dell"], [a, _]],
          [
            /\b(q(?:mv|ta)\w+) b/i
            // Verizon Tablet
          ],
          [s, [l, "Verizon"], [a, _]],
          [
            /\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i
            // Barnes & Noble Tablet
          ],
          [s, [l, "Barnes & Noble"], [a, _]],
          [
            /\b(tm\d{3}\w+) b/i
          ],
          [s, [l, "NuVision"], [a, _]],
          [
            /\b(k88) b/i
            // ZTE K Series Tablet
          ],
          [s, [l, "ZTE"], [a, _]],
          [
            /\b(nx\d{3}j) b/i
            // ZTE Nubia
          ],
          [s, [l, "ZTE"], [a, g]],
          [
            /\b(gen\d{3}) b.+49h/i
            // Swiss GEN Mobile
          ],
          [s, [l, "Swiss"], [a, g]],
          [
            /\b(zur\d{3}) b/i
            // Swiss ZUR Tablet
          ],
          [s, [l, "Swiss"], [a, _]],
          [
            /\b((zeki)?tb.*\b) b/i
            // Zeki Tablets
          ],
          [s, [l, "Zeki"], [a, _]],
          [
            /\b([yr]\d{2}) b/i,
            /\b(dragon[- ]+touch |dt)(\w{5}) b/i
            // Dragon Touch Tablet
          ],
          [[l, "Dragon Touch"], s, [a, _]],
          [
            /\b(ns-?\w{0,9}) b/i
            // Insignia Tablets
          ],
          [s, [l, "Insignia"], [a, _]],
          [
            /\b((nxa|next)-?\w{0,9}) b/i
            // NextBook Tablets
          ],
          [s, [l, "NextBook"], [a, _]],
          [
            /\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i
            // Voice Xtreme Phones
          ],
          [[l, "Voice"], s, [a, g]],
          [
            /\b(lvtel\-)?(v1[12]) b/i
            // LvTel Phones
          ],
          [[l, "LvTel"], s, [a, g]],
          [
            /\b(ph-1) /i
            // Essential PH-1
          ],
          [s, [l, "Essential"], [a, g]],
          [
            /\b(v(100md|700na|7011|917g).*\b) b/i
            // Envizen Tablets
          ],
          [s, [l, "Envizen"], [a, _]],
          [
            /\b(trio[-\w\. ]+) b/i
            // MachSpeed Tablets
          ],
          [s, [l, "MachSpeed"], [a, _]],
          [
            /\btu_(1491) b/i
            // Rotor Tablets
          ],
          [s, [l, "Rotor"], [a, _]],
          [
            /((?:tegranote|shield t(?!.+d tv))[\w- ]*?)(?: b|\))/i
            // Nvidia Tablets
          ],
          [s, [l, Me], [a, _]],
          [
            /(sprint) (\w+)/i
            // Sprint Phones
          ],
          [l, s, [a, g]],
          [
            /(kin\.[onetw]{3})/i
            // Microsoft Kin
          ],
          [[s, /\./g, " "], [l, Ae], [a, g]],
          [
            /droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i
            // Zebra
          ],
          [s, [l, Ce], [a, _]],
          [
            /droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i
          ],
          [s, [l, Ce], [a, g]],
          [
            ///////////////////
            // SMARTTVS
            ///////////////////
            /smart-tv.+(samsung)/i
            // Samsung
          ],
          [l, [a, M]],
          [
            /hbbtv.+maple;(\d+)/i
          ],
          [[s, /^/, "SmartTV"], [l, he], [a, M]],
          [
            /(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i
            // LG SmartTV
          ],
          [[l, Oe], [a, M]],
          [
            /(apple) ?tv/i
            // Apple TV
          ],
          [l, [s, de + " TV"], [a, M]],
          [
            /crkey/i
            // Google Chromecast
          ],
          [[s, Re + "cast"], [l, xe], [a, M]],
          [
            /droid.+aft(\w+)( bui|\))/i
            // Fire TV
          ],
          [s, [l, De], [a, M]],
          [
            /(shield \w+ tv)/i
            // Nvidia Shield TV
          ],
          [s, [l, Me], [a, M]],
          [
            /\(dtv[\);].+(aquos)/i,
            /(aquos-tv[\w ]+)\)/i
            // Sharp
          ],
          [s, [l, ye], [a, M]],
          [
            /(bravia[\w ]+)( bui|\))/i
            // Sony
          ],
          [s, [l, Y], [a, M]],
          [
            /(mi(tv|box)-?\w+) bui/i
            // Xiaomi
          ],
          [s, [l, Ne], [a, M]],
          [
            /Hbbtv.*(technisat) (.*);/i
            // TechniSAT
          ],
          [l, s, [a, M]],
          [
            /\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i,
            // Roku
            /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i
            // HbbTV devices
          ],
          [[l, Lt], [s, Lt], [a, M]],
          [
            // SmartTV from Unidentified Vendors
            /droid.+; ([\w- ]+) (?:android tv|smart[- ]?tv)/i
          ],
          [s, [a, M]],
          [
            /\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i
          ],
          [[a, M]],
          [
            ///////////////////
            // CONSOLES
            ///////////////////
            /(ouya)/i,
            // Ouya
            /(nintendo) ([wids3utch]+)/i
            // Nintendo
          ],
          [l, s, [a, A]],
          [
            /droid.+; (shield)( bui|\))/i
            // Nvidia Portable
          ],
          [s, [l, Me], [a, A]],
          [
            /(playstation \w+)/i
            // Playstation
          ],
          [s, [l, Y], [a, A]],
          [
            /\b(xbox(?: one)?(?!; xbox))[\); ]/i
            // Microsoft Xbox
          ],
          [s, [l, Ae], [a, A]],
          [
            ///////////////////
            // WEARABLES
            ///////////////////
            /\b(sm-[lr]\d\d[0156][fnuw]?s?|gear live)\b/i
            // Samsung Galaxy Watch
          ],
          [s, [l, he], [a, F]],
          [
            /((pebble))app/i,
            // Pebble
            /(asus|google|lg|oppo) ((pixel |zen)?watch[\w ]*)( bui|\))/i
            // Asus ZenWatch / LG Watch / Pixel Watch
          ],
          [l, s, [a, F]],
          [
            /(ow(?:19|20)?we?[1-3]{1,3})/i
            // Oppo Watch
          ],
          [s, [l, Fe], [a, F]],
          [
            /(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i
            // Apple Watch
          ],
          [s, [l, de], [a, F]],
          [
            /(opwwe\d{3})/i
            // OnePlus Watch
          ],
          [s, [l, st], [a, F]],
          [
            /(moto 360)/i
            // Motorola 360
          ],
          [s, [l, Le], [a, F]],
          [
            /(smartwatch 3)/i
            // Sony SmartWatch
          ],
          [s, [l, Y], [a, F]],
          [
            /(g watch r)/i
            // LG G Watch R
          ],
          [s, [l, Oe], [a, F]],
          [
            /droid.+; (wt63?0{2,3})\)/i
          ],
          [s, [l, Ce], [a, F]],
          [
            ///////////////////
            // XR
            ///////////////////
            /droid.+; (glass) \d/i
            // Google Glass
          ],
          [s, [l, xe], [a, F]],
          [
            /(pico) (4|neo3(?: link|pro)?)/i
            // Pico
          ],
          [l, s, [a, F]],
          [
            /; (quest( \d| pro)?)/i
            // Oculus Quest
          ],
          [s, [l, H], [a, F]],
          [
            ///////////////////
            // EMBEDDED
            ///////////////////
            /(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i
            // Tesla
          ],
          [l, [a, G]],
          [
            /(aeobc)\b/i
            // Echo Dot
          ],
          [s, [l, De], [a, G]],
          [
            /(homepod).+mac os/i
            // Apple HomePod
          ],
          [s, [l, de], [a, G]],
          [
            /windows iot/i
          ],
          [[a, G]],
          [
            ////////////////////
            // MIXED (GENERIC)
            ///////////////////
            /droid .+?; ([^;]+?)(?: bui|; wv\)|\) applew).+? mobile safari/i
            // Android Phones from Unidentified Vendors
          ],
          [s, [a, g]],
          [
            /droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i
            // Android Tablets from Unidentified Vendors
          ],
          [s, [a, _]],
          [
            /\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i
            // Unidentifiable Tablet
          ],
          [[a, _]],
          [
            /(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i
            // Unidentifiable Mobile
          ],
          [[a, g]],
          [
            /droid .+?; ([\w\. -]+)( bui|\))/i
            // Generic Android Device
          ],
          [s, [l, "Generic"]]
        ],
        engine: [
          [
            /windows.+ edge\/([\w\.]+)/i
            // EdgeHTML
          ],
          [p, [u, Ot + "HTML"]],
          [
            /(arkweb)\/([\w\.]+)/i
            // ArkWeb
          ],
          [u, p],
          [
            /webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i
            // Blink
          ],
          [p, [u, "Blink"]],
          [
            /(presto)\/([\w\.]+)/i,
            // Presto
            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna|servo)\/([\w\.]+)/i,
            // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m/Goanna/Servo
            /ekioh(flow)\/([\w\.]+)/i,
            // Flow
            /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i,
            // KHTML/Tasman/Links
            /(icab)[\/ ]([23]\.[\d\.]+)/i,
            // iCab
            /\b(libweb)/i
            // LibWeb
          ],
          [u, p],
          [
            /ladybird\//i
          ],
          [[u, "LibWeb"]],
          [
            /rv\:([\w\.]{1,9})\b.+(gecko)/i
            // Gecko
          ],
          [p, u]
        ],
        os: [
          [
            // Windows
            /microsoft (windows) (vista|xp)/i
            // Windows (iTunes)
          ],
          [u, p],
          [
            /(windows (?:phone(?: os)?|mobile|iot))[\/ ]?([\d\.\w ]*)/i
            // Windows Phone
          ],
          [u, [p, je, ii]],
          [
            /windows nt 6\.2; (arm)/i,
            // Windows RT
            /windows[\/ ]([ntce\d\. ]+\w)(?!.+xbox)/i,
            /(?:win(?=3|9|n)|win 9x )([nt\d\.]+)/i
          ],
          [[p, je, ii], [u, "Windows"]],
          [
            // iOS/macOS
            /[adehimnop]{4,7}\b(?:.*os ([\w]+) like mac|; opera)/i,
            // iOS
            /(?:ios;fbsv\/|iphone.+ios[\/ ])([\d\.]+)/i,
            /cfnetwork\/.+darwin/i
          ],
          [[p, /_/g, "."], [u, "iOS"]],
          [
            /(mac os x) ?([\w\. ]*)/i,
            /(macintosh|mac_powerpc\b)(?!.+haiku)/i
            // Mac OS
          ],
          [[u, C], [p, /_/g, "."]],
          [
            // Mobile OSes
            /droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i
            // Android-x86/HarmonyOS
          ],
          [p, u],
          [
            /(ubuntu) ([\w\.]+) like android/i
            // Ubuntu Touch
          ],
          [[u, /(.+)/, "$1 Touch"], p],
          [
            // Android/Blackberry/WebOS/QNX/Bada/RIM/KaiOS/Maemo/MeeGo/S40/Sailfish OS/OpenHarmony/Tizen
            /(android|bada|blackberry|kaios|maemo|meego|openharmony|qnx|rim tablet os|sailfish|series40|symbian|tizen|webos)\w*[-\/; ]?([\d\.]*)/i
          ],
          [u, p],
          [
            /\(bb(10);/i
            // BlackBerry 10
          ],
          [p, [u, oe]],
          [
            /(?:symbian ?os|symbos|s60(?=;)|series ?60)[-\/ ]?([\w\.]*)/i
            // Symbian
          ],
          [p, [u, "Symbian"]],
          [
            /mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i
            // Firefox OS
          ],
          [p, [u, $e + " OS"]],
          [
            /web0s;.+rt(tv)/i,
            /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i
            // WebOS
          ],
          [p, [u, "webOS"]],
          [
            /watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i
            // watchOS
          ],
          [p, [u, "watchOS"]],
          [
            // Google Chromecast
            /crkey\/([\d\.]+)/i
            // Google Chromecast
          ],
          [p, [u, Re + "cast"]],
          [
            /(cros) [\w]+(?:\)| ([\w\.]+)\b)/i
            // Chromium OS
          ],
          [[u, b], p],
          [
            // Smart TVs
            /panasonic;(viera)/i,
            // Panasonic Viera
            /(netrange)mmh/i,
            // Netrange
            /(nettv)\/(\d+\.[\w\.]+)/i,
            // NetTV
            // Console
            /(nintendo|playstation) ([wids345portablevuch]+)/i,
            // Nintendo/Playstation
            /(xbox); +xbox ([^\);]+)/i,
            // Microsoft Xbox (360, One, X, S, Series X, Series S)
            // Other
            /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i,
            // Joli/Palm
            /(mint)[\/\(\) ]?(\w*)/i,
            // Mint
            /(mageia|vectorlinux)[; ]/i,
            // Mageia/VectorLinux
            /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i,
            // Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware/Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus/Raspbian/Plan9/Minix/RISCOS/Contiki/Deepin/Manjaro/elementary/Sabayon/Linspire
            /(hurd|linux)(?: arm\w*| x86\w*| ?)([\w\.]*)/i,
            // Hurd/Linux
            /(gnu) ?([\w\.]*)/i,
            // GNU
            /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i,
            // FreeBSD/NetBSD/OpenBSD/PC-BSD/GhostBSD/DragonFly
            /(haiku) (\w+)/i
            // Haiku
          ],
          [u, p],
          [
            /(sunos) ?([\w\.\d]*)/i
            // Solaris
          ],
          [[u, "Solaris"], p],
          [
            /((?:open)?solaris)[-\/ ]?([\w\.]*)/i,
            // Solaris
            /(aix) ((\d)(?=\.|\)| )[\w\.])*/i,
            // AIX
            /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i,
            // BeOS/OS2/AmigaOS/MorphOS/OpenVMS/Fuchsia/HP-UX/SerenityOS
            /(unix) ?([\w\.]*)/i
            // UNIX
          ],
          [u, p]
        ]
      }, X = function(y, E) {
        if (typeof y === d && (E = y, y = r), !(this instanceof X))
          return new X(y, E).getResult();
        var x = typeof i !== f && i.navigator ? i.navigator : r, T = y || (x && x.userAgent ? x.userAgent : o), ae = x && x.userAgentData ? x.userAgentData : r, te = E ? S(ri, E) : ri, k = x && x.userAgent == T;
        return this.getBrowser = function() {
          var m = {};
          return m[u] = r, m[p] = r, He.call(m, T, te.browser), m[w] = lr(m[p]), k && x && x.brave && typeof x.brave.isBrave == h && (m[u] = "Brave"), m;
        }, this.getCPU = function() {
          var m = {};
          return m[O] = r, He.call(m, T, te.cpu), m;
        }, this.getDevice = function() {
          var m = {};
          return m[l] = r, m[s] = r, m[a] = r, He.call(m, T, te.device), k && !m[a] && ae && ae.mobile && (m[a] = g), k && m[s] == "Macintosh" && x && typeof x.standalone !== f && x.maxTouchPoints && x.maxTouchPoints > 2 && (m[s] = "iPad", m[a] = _), m;
        }, this.getEngine = function() {
          var m = {};
          return m[u] = r, m[p] = r, He.call(m, T, te.engine), m;
        }, this.getOS = function() {
          var m = {};
          return m[u] = r, m[p] = r, He.call(m, T, te.os), k && !m[u] && ae && ae.platform && ae.platform != "Unknown" && (m[u] = ae.platform.replace(/chrome os/i, b).replace(/macos/i, C)), m;
        }, this.getResult = function() {
          return {
            ua: this.getUA(),
            browser: this.getBrowser(),
            engine: this.getEngine(),
            os: this.getOS(),
            device: this.getDevice(),
            cpu: this.getCPU()
          };
        }, this.getUA = function() {
          return T;
        }, this.setUA = function(m) {
          return T = typeof m === v && m.length > Se ? Lt(m, Se) : m, this;
        }, this.setUA(T), this;
      };
      X.VERSION = n, X.BROWSER = $([u, p, w]), X.CPU = $([O]), X.DEVICE = $([s, l, a, A, g, M, _, F, G]), X.ENGINE = X.OS = $([u, p]), t.exports && (e = t.exports = X), e.UAParser = X;
      var Pe = typeof i !== f && (i.jQuery || i.Zepto);
      if (Pe && !Pe.ua) {
        var ot = new X();
        Pe.ua = ot.getResult(), Pe.ua.get = function() {
          return ot.getUA();
        }, Pe.ua.set = function(y) {
          ot.setUA(y);
          var E = ot.getResult();
          for (var x in E)
            Pe.ua[x] = E[x];
        };
      }
    })(typeof window == "object" ? window : Tn);
  })(Xe, Xe.exports)), Xe.exports;
}
var $n = Rn();
const On = /* @__PURE__ */ Dn($n), An = new On(), sr = An.getResult(), Ln = (_a = sr.engine.name) == null ? void 0 : _a.toLowerCase(), vi = Number((_b = sr.engine.version) == null ? void 0 : _b.split(".")[0]), zt = {
  "0x0001": "Escape",
  "0x0002": "Digit1",
  "0x0003": "Digit2",
  "0x0004": "Digit3",
  "0x0005": "Digit4",
  "0x0006": "Digit5",
  "0x0007": "Digit6",
  "0x0008": "Digit7",
  "0x0009": "Digit8",
  "0x000A": "Digit9",
  "0x000B": "Digit0",
  "0x000C": "Minus",
  "0x000D": "Equal",
  "0x000E": "Backspace",
  "0x000F": "Tab",
  "0x0010": "KeyQ",
  "0x0011": "KeyW",
  "0x0012": "KeyE",
  "0x0013": "KeyR",
  "0x0014": "KeyT",
  "0x0015": "KeyY",
  "0x0016": "KeyU",
  "0x0017": "KeyI",
  "0x0018": "KeyO",
  "0x0019": "KeyP",
  "0x001A": "BracketLeft",
  "0x001B": "BracketRight",
  "0x001C": "Enter",
  "0x001D": "ControlLeft",
  "0x001E": "KeyA",
  "0x001F": "KeyS",
  "0x0020": "KeyD",
  "0x0021": "KeyF",
  "0x0022": "KeyG",
  "0x0023": "KeyH",
  "0x0024": "KeyJ",
  "0x0025": "KeyK",
  "0x0026": "KeyL",
  "0x0027": "Semicolon",
  "0x0028": "Quote",
  "0x0029": "Backquote",
  "0x002A": "ShiftLeft",
  "0x002B": "Backslash",
  "0x002C": "KeyZ",
  "0x002D": "KeyX",
  "0x002E": "KeyC",
  "0x002F": "KeyV",
  "0x0030": "KeyB",
  "0x0031": "KeyN",
  "0x0032": "KeyM",
  "0x0033": "Comma",
  "0x0034": "Period",
  "0x0035": "Slash",
  "0x0036": "ShiftRight",
  "0x0037": "NumpadMultiply",
  "0x0038": "AltLeft",
  "0x0039": "Space",
  "0x003A": "CapsLock",
  "0x003B": "F1",
  "0x003C": "F2",
  "0x003D": "F3",
  "0x003E": "F4",
  "0x003F": "F5",
  "0x0040": "F6",
  "0x0041": "F7",
  "0x0042": "F8",
  "0x0043": "F9",
  "0x0044": "F10",
  "0x0045": "Pause",
  "0x0046": "ScrollLock",
  "0x0047": "Numpad7",
  "0x0048": "Numpad8",
  "0x0049": "Numpad9",
  "0x004A": "NumpadSubtract",
  "0x004B": "Numpad4",
  "0x004C": "Numpad5",
  "0x004D": "Numpad6",
  "0x004E": "NumpadAdd",
  "0x004F": "Numpad1",
  "0x0050": "Numpad2",
  "0x0051": "Numpad3",
  "0x0052": "Numpad0",
  "0x0053": "NumpadDecimal",
  "0x0056": "IntlBackslash",
  "0x0057": "F11",
  "0x0058": "F12",
  "0x0059": "NumpadEqual",
  "0x0064": "F13",
  "0x0065": "F14",
  "0x0066": "F15",
  "0x0067": "F16",
  "0x0068": "F17",
  "0x0069": "F18",
  "0x006A": "F19",
  "0x006B": "F20",
  "0x006C": "F21",
  "0x006D": "F22",
  "0x006E": "F23",
  "0x0070": "KanaMode",
  "0x0071": "Lang2",
  "0x0072": "Lang1",
  "0x0073": "IntlRo",
  "0x0076": "F24",
  "0x0079": "Convert",
  "0x007B": "NonConvert",
  "0x007D": "IntlYen",
  "0x007E": "NumpadComma",
  "0xE010": "MediaTrackPrevious",
  "0xE019": "MediaTrackNext",
  "0xE01C": "NumpadEnter",
  "0xE01D": "ControlRight",
  "0xE021": "LaunchApp2",
  "0xE022": "MediaPlayPause",
  "0xE024": "MediaStop",
  "0xE032": "BrowserHome",
  "0xE035": "NumpadDivide",
  "0xE037": "PrintScreen",
  "0xE038": "AltRight",
  "0xE045": "NumLock",
  "0xE046": "Pause",
  "0xE047": "Home",
  "0xE048": "ArrowUp",
  "0xE049": "PageUp",
  "0xE04B": "ArrowLeft",
  "0xE04D": "ArrowRight",
  "0xE04F": "End",
  "0xE050": "ArrowDown",
  "0xE051": "PageDown",
  "0xE052": "Insert",
  "0xE053": "Delete",
  "0xE05D": "ContextMenu",
  "0xE05E": "Power",
  "0xE065": "BrowserSearch",
  "0xE066": "BrowserFavorites",
  "0xE067": "BrowserRefresh",
  "0xE068": "BrowserStop",
  "0xE069": "BrowserForward",
  "0xE06A": "BrowserBack",
  "0xE06B": "LaunchApp1",
  "0xE06C": "LaunchMail",
  "0xE06D": "MediaSelect"
}, wi = {
  "0x0077": "Lang4",
  "0x0078": "Lang3",
  "0xE008": "Undo",
  "0xE00A": "Paste",
  "0xE017": "Cut",
  "0xE018": "Copy",
  "0xE020": "AudioVolumeMute",
  "0xE02C": "Eject",
  "0xE02E": "AudioVolumeDown",
  "0xE030": "AudioVolumeUp",
  "0xE03B": "Help",
  "0xE05B": "MetaLeft",
  "0xE05C": "MetaRight",
  "0xE05F": "Sleep",
  "0xE063": "WakeUp"
}, Mn = {
  "0x0054": "PrintScreen",
  "0xE020": "VolumeMute",
  // The documentation says it's 'AudioVolumeMute', but the actual test shows that it's 'VolumeMute'.
  "0xE02E": "VolumeDown",
  "0xE030": "VolumeUp",
  "0xE05B": vi > 117 ? "MetaLeft" : "OSLeft",
  "0xE05C": vi > 117 ? "MetaRight" : "OSRight"
}, Fn = {
  blink: Bt({ ...zt, ...wi }),
  gecko: Bt({ ...zt, ...Mn }),
  webkit: Bt({ ...zt, ...wi })
};
function Bt(t) {
  const e = {};
  for (const [i, r] of Object.entries(t))
    e[r] = i;
  return e;
}
const mi = function(t) {
  const e = Fn[Ln];
  return parseInt(e[t], 16);
};
var Ht = /* @__PURE__ */ ((t) => (t.CTRL_LEFT = "ControlLeft", t.SHIFT_LEFT = "ShiftLeft", t.SHIFT_RIGHT = "ShiftRight", t.ALT_LEFT = "AltLeft", t.CTRL_RIGHT = "ControlRight", t.ALT_RIGHT = "AltRight", t.ControlLeft = "ControlLeft", t.ShiftLeft = "ShiftLeft", t.ShiftRight = "ShiftRight", t.AltLeft = "AltLeft", t.ControlRight = "ControlRight", t.AltRight = "AltRight", t))(Ht || {}), Ie = /* @__PURE__ */ ((t) => (t.CAPS_LOCK = "CapsLock", t.NUM_LOCK = "NumLock", t.SCROLL_LOCK = "ScrollLock", t.KANA_MODE = "KanaMode", t.CapsLock = "CapsLock", t.ScrollLock = "ScrollLock", t.NumLock = "NumLock", t.KanaMode = "KanaMode", t))(Ie || {}), ue = /* @__PURE__ */ ((t) => (t[t.CTRL_ALT_DEL = 0] = "CTRL_ALT_DEL", t[t.META = 1] = "META", t[t.CTRL_C = 2] = "CTRL_C", t[t.CTRL_V = 3] = "CTRL_V", t))(ue || {}), be = /* @__PURE__ */ ((t) => (t[t.Fit = 1] = "Fit", t[t.Full = 2] = "Full", t[t.Real = 3] = "Real", t))(be || {}), Ze = /* @__PURE__ */ ((t) => (t[t.Pixel = 0] = "Pixel", t[t.Line = 1] = "Line", t[t.Page = 2] = "Page", t))(Ze || {});
class Nn {
  constructor(e, i, r) {
    __publicField(this, "username");
    __publicField(this, "password");
    __publicField(this, "destination");
    __publicField(this, "proxyAddress");
    __publicField(this, "serverDomain");
    __publicField(this, "authToken");
    __publicField(this, "desktopSize");
    __publicField(this, "extensions");
    this.username = e.username, this.password = e.password, this.proxyAddress = i.address, this.authToken = i.authToken, this.destination = r.destination, this.serverDomain = r.serverDomain, this.extensions = r.extensions, this.desktopSize = r.desktopSize;
  }
}
class Pn {
  /**
   * Creates a new ConfigBuilder instance.
   */
  constructor() {
    __publicField(this, "username", "");
    __publicField(this, "password", "");
    __publicField(this, "destination", "");
    __publicField(this, "proxyAddress", "");
    __publicField(this, "serverDomain", "");
    __publicField(this, "authToken", "");
    __publicField(this, "desktopSize");
    __publicField(this, "extensions", []);
  }
  /**
   * Optional parameter
   *
   * @param username - The username to use for authentication
   * @returns The builder instance for method chaining
   */
  withUsername(e) {
    return this.username = e, this;
  }
  /**
   * Optional parameter
   *
   * @param password - The password for authentication
   * @returns The builder instance for method chaining
   */
  withPassword(e) {
    return this.password = e, this;
  }
  /**
   * Required parameter
   *
   * @param destination - The destination address to connect to
   * @returns The builder instance for method chaining
   */
  withDestination(e) {
    return this.destination = e, this;
  }
  /**
   * Required parameter
   *
   * @param proxyAddress - The address of the proxy server
   * @returns The builder instance for method chaining
   */
  withProxyAddress(e) {
    return this.proxyAddress = e, this;
  }
  /**
   * Optional parameter
   *
   * @param serverDomain - The server domain to connect to
   * @returns The builder instance for method chaining
   */
  withServerDomain(e) {
    return this.serverDomain = e, this;
  }
  /**
   * Required parameter
   *
   * @param authToken - JWT token to connect to the proxy
   * @returns The builder instance for method chaining
   */
  withAuthToken(e) {
    return this.authToken = e, this;
  }
  /**
   * Optional parameter
   *
   * @param ext - The extension
   * @returns The builder instance for method chaining
   */
  withExtension(e) {
    return this.extensions.push(e), this;
  }
  /**
   * Optional
   *
   * @param desktopSize - The desktop size configuration object
   * @returns The builder instance for method chaining
   */
  withDesktopSize(e) {
    return this.desktopSize = e, this;
  }
  /**
   * Builds a new Config instance.
   *
   * @throws {Error} If required parameters (destination, proxyAddress, authToken) are not set
   * @returns A new Config instance with the configured values
   */
  build() {
    if (this.destination === "")
      throw new Error("destination has to be specified");
    if (this.proxyAddress === "")
      throw new Error("proxy address has to be specified");
    if (this.authToken === "")
      throw new Error("authentication token has to be specified");
    const e = { username: this.username, password: this.password }, i = { address: this.proxyAddress, authToken: this.authToken }, r = {
      destination: this.destination,
      serverDomain: this.serverDomain,
      extensions: this.extensions,
      desktopSize: this.desktopSize
    };
    return new Nn(e, i, r);
  }
}
class Be {
  constructor() {
    __publicField(this, "subscribers");
    this.subscribers = [];
  }
  subscribe(e) {
    this.subscribers.push(e);
  }
  publish(e) {
    for (const i of this.subscribers)
      i(e);
  }
}
class Un {
  constructor(e) {
    __publicField(this, "module");
    __publicField(this, "canvas");
    __publicField(this, "keyboardUnicodeMode", false);
    __publicField(this, "backendSupportsUnicodeKeyboardShortcuts");
    __publicField(this, "onRemoteClipboardChanged");
    __publicField(this, "onForceClipboardUpdate");
    __publicField(this, "onCanvasResized");
    __publicField(this, "onWarningCallback");
    __publicField(this, "onClipboardRemoteUpdate");
    __publicField(this, "fileTransferProvider");
    __publicField(this, "cursorHasOverride", false);
    __publicField(this, "lastCursorStyle", "default");
    __publicField(this, "enableClipboard", true);
    __publicField(this, "_autoClipboard", true);
    __publicField(this, "sessionStartedObservable", new Be());
    __publicField(this, "resizeObservable", new Be());
    __publicField(this, "session");
    __publicField(this, "modifierKeyPressed", []);
    __publicField(this, "mousePositionObservable", new Be());
    __publicField(this, "changeVisibilityObservable", new Be());
    __publicField(this, "scaleObservable", new Be());
    __publicField(this, "dynamicResizeObservable", new Be());
    this.module = e, N.info("Web bridge initialized.");
  }
  get autoClipboard() {
    return this._autoClipboard;
  }
  // If set to false, the clipboard will not be enabled and the callbacks will not be registered to the Rust side
  setEnableClipboard(e) {
    this.enableClipboard = e;
  }
  // If set to true, automatic clipboard synchronization with the server is enabled.
  //
  // If set to false, then the client must invoke `PublicAPI.saveRemoteClipboardData` and
  // `PublicAPI.sendClipboardData` to write to clipboard and to send clipboard data to the server.
  setEnableAutoClipboard(e) {
    this._autoClipboard = e;
  }
  /// Callback to set the local clipboard content to data received from the remote.
  setOnRemoteClipboardChanged(e) {
    this.onRemoteClipboardChanged = e;
  }
  /// Callback which is called when the remote requests a forced clipboard update (e.g. on
  /// clipboard initialization sequence)
  setOnForceClipboardUpdate(e) {
    this.onForceClipboardUpdate = e;
  }
  /// Callback which is called when the canvas is resized.
  setOnCanvasResized(e) {
    this.onCanvasResized = e;
  }
  /// Callback which is called when the warning event is emitted.
  setOnWarningCallback(e) {
    this.onWarningCallback = e;
  }
  /// Callback which is called when the clipboard remote update event is emitted.
  setOnClipboardRemoteUpdate(e) {
    this.onClipboardRemoteUpdate = e;
  }
  /**
   * Enable file transfer support. Must be called before connect().
   * Implicitly enables clipboard (required for file transfer protocol).
   *
   * @param provider - Protocol-specific file transfer provider (e.g., RdpFileTransferProvider)
   * @returns The same provider, for chaining
   */
  enableFileTransfer(e) {
    var _a2;
    return (_a2 = this.fileTransferProvider) == null ? void 0 : _a2.dispose(), this.fileTransferProvider = e, this.enableClipboard = true, e;
  }
  mouseIn(e) {
    if (!this.session) return;
    this.syncModifier(e);
    const r = [
      [1, 0],
      // left button
      [2, 2],
      // right button
      [4, 1]
      // middle button
    ].filter(([n]) => (e.buttons & n) === 0).map(([, n]) => this.module.DeviceEvent.mouseButtonReleased(n));
    r.length > 0 && this.doTransactionFromDeviceEvents(r);
  }
  mouseOut(e) {
    this.releaseAllInputs();
  }
  focusLost() {
    this.releaseAllInputs();
  }
  sendKeyboardEvent(e) {
    this.sendKeyboard(e);
  }
  shutdown() {
    var _a2, _b2;
    (_a2 = this.fileTransferProvider) == null ? void 0 : _a2.dispose(), (_b2 = this.session) == null ? void 0 : _b2.shutdown();
  }
  mouseButtonState(e, i, r) {
    r && e.preventDefault();
    const n = i ? this.module.DeviceEvent.mouseButtonPressed : this.module.DeviceEvent.mouseButtonReleased;
    this.doTransactionFromDeviceEvents([n(e.button)]);
  }
  updateMousePosition(e) {
    this.doTransactionFromDeviceEvents([this.module.DeviceEvent.mouseMove(e.x, e.y)]), this.mousePositionObservable.publish(e);
  }
  configBuilder() {
    return new Pn();
  }
  async connect(e) {
    var _a2;
    const i = new this.module.SessionBuilder();
    if (i.proxyAddress(e.proxyAddress), i.destination(e.destination), i.serverDomain(e.serverDomain), i.password(e.password), i.authToken(e.authToken), i.username(e.username), i.renderCanvas(this.canvas), i.setCursorStyleCallbackContext(this), i.setCursorStyleCallback(this.setCursorStyleCallback), e.extensions.forEach((o) => {
      i.extension(o);
    }), this.onRemoteClipboardChanged != null && this.enableClipboard && i.remoteClipboardChangedCallback(this.onRemoteClipboardChanged), this.onForceClipboardUpdate != null && this.enableClipboard && i.forceClipboardUpdateCallback(this.onForceClipboardUpdate), this.fileTransferProvider != null && this.enableClipboard)
      for (const o of this.fileTransferProvider.getBuilderExtensions())
        i.extension(o);
    this.onCanvasResized != null && i.canvasResizedCallback(this.onCanvasResized), e.desktopSize != null && i.desktopSize(
      new this.module.DesktopSize(e.desktopSize.width, e.desktopSize.height)
    );
    const r = await i.connect();
    this.session = r, (_a2 = this.fileTransferProvider) == null ? void 0 : _a2.setSession(r), this.resizeObservable.publish({
      desktopSize: r.desktopSize(),
      sessionId: 0
    }), this.sessionStartedObservable.publish(null);
    const n = async () => {
      try {
        return N.info("Starting the session."), await r.run();
      } finally {
        this.setVisibility(false);
      }
    };
    return {
      sessionId: 0,
      initialDesktopSize: r.desktopSize(),
      websocketPort: 0,
      run: n
    };
  }
  sendSpecialCombination(e) {
    switch (e) {
      case ue.CTRL_ALT_DEL:
        this.ctrlAltDel();
        break;
      case ue.META:
        this.sendMeta();
        break;
      case ue.CTRL_C:
        this.sendCtrlC();
        break;
      case ue.CTRL_V:
        this.sendCtrlV();
        break;
    }
  }
  rotation_unit_from_wheel_event(e) {
    switch (e.deltaMode) {
      case e.DOM_DELTA_PIXEL:
        return Ze.Pixel;
      case e.DOM_DELTA_LINE:
        return Ze.Line;
      case e.DOM_DELTA_PAGE:
        return Ze.Page;
      default:
        return Ze.Pixel;
    }
  }
  mouseWheel(e) {
    const i = e.deltaY !== 0, r = i ? e.deltaY : e.deltaX, n = this.rotation_unit_from_wheel_event(e);
    this.doTransactionFromDeviceEvents([
      this.module.DeviceEvent.wheelRotations(i, -r, n)
    ]);
  }
  emitWarningEvent(e) {
    var _a2;
    (_a2 = this.onWarningCallback) == null ? void 0 : _a2.call(this, e);
  }
  emitClipboardRemoteUpdateEvent() {
    var _a2;
    (_a2 = this.onClipboardRemoteUpdate) == null ? void 0 : _a2.call(this);
  }
  setVisibility(e) {
    this.changeVisibilityObservable.publish(e);
  }
  setScale(e) {
    this.scaleObservable.publish(e);
  }
  setCanvas(e) {
    this.canvas = e;
  }
  resizeDynamic(e, i, r) {
    var _a2;
    this.dynamicResizeObservable.publish({ width: e, height: i }), (_a2 = this.session) == null ? void 0 : _a2.resize(e, i, r);
  }
  /// Triggered by the browser when local clipboard is updated. Clipboard backend should
  /// cache the content and send it to the server when it is requested.
  onClipboardChanged(e) {
    return (async () => {
      var _a2;
      await ((_a2 = this.session) == null ? void 0 : _a2.onClipboardPaste(e));
    })();
  }
  onClipboardChangedEmpty() {
    return (async () => {
      var _a2;
      await ((_a2 = this.session) == null ? void 0 : _a2.onClipboardPaste(new this.module.ClipboardData()));
    })();
  }
  setKeyboardUnicodeMode(e) {
    this.keyboardUnicodeMode = e;
  }
  setCursorStyleOverride(e) {
    e == null ? (this.canvas.style.cursor = this.lastCursorStyle, this.cursorHasOverride = false) : (this.canvas.style.cursor = e, this.cursorHasOverride = true);
  }
  invokeExtension(e) {
    var _a2;
    return (_a2 = this.session) == null ? void 0 : _a2.invokeExtension(e);
  }
  releaseAllInputs() {
    var _a2;
    (_a2 = this.session) == null ? void 0 : _a2.releaseAllInputs();
  }
  supportsUnicodeKeyboardShortcuts() {
    var _a2, _b2;
    return this.backendSupportsUnicodeKeyboardShortcuts !== void 0 ? this.backendSupportsUnicodeKeyboardShortcuts : ((_a2 = this.session) == null ? void 0 : _a2.supportsUnicodeKeyboardShortcuts) ? (this.backendSupportsUnicodeKeyboardShortcuts = (_b2 = this.session) == null ? void 0 : _b2.supportsUnicodeKeyboardShortcuts(), this.backendSupportsUnicodeKeyboardShortcuts) : true;
  }
  sendKeyboard(e) {
    e.preventDefault();
    let i, r;
    e.type === "keydown" ? (i = this.module.DeviceEvent.keyPressed, r = this.module.DeviceEvent.unicodePressed) : e.type === "keyup" && (i = this.module.DeviceEvent.keyReleased, r = this.module.DeviceEvent.unicodeReleased);
    let n = true;
    if (!this.supportsUnicodeKeyboardShortcuts()) {
      for (const h of ["Alt", "Control", "Meta", "AltGraph", "OS"])
        if (e.getModifierState(h)) {
          n = false;
          break;
        }
    }
    const o = e.code in Ht, c = e.code in Ie;
    if (o && this.updateModifierKeyState(e), c && this.syncModifier(e), !e.repeat || !o && !c) {
      const h = mi(e.code), f = Number.isNaN(h);
      if (!this.keyboardUnicodeMode && i && !f) {
        this.doTransactionFromDeviceEvents([i(h)]);
        return;
      }
      if (this.keyboardUnicodeMode && r && i) {
        if (["Dead", "Unidentified"].indexOf(e.key) != -1)
          return;
        const d = mi(e.key);
        Number.isNaN(d) && e.key.length === 1 && !o && n ? this.doTransactionFromDeviceEvents([r(e.key)]) : f || this.doTransactionFromDeviceEvents([i(h)]);
        return;
      }
    }
  }
  setCursorStyleCallback(e, i, r, n) {
    let o;
    switch (e) {
      case "hidden": {
        o = "none";
        break;
      }
      case "default": {
        o = "default";
        break;
      }
      case "url": {
        if (i == null || r == null || n == null) {
          console.error("Invalid custom cursor parameters.");
          return;
        }
        const c = new Image();
        c.src = i;
        const h = Math.round(r), f = Math.round(n);
        o = `url(${i}) ${h} ${f}, default`;
        break;
      }
      default: {
        console.error(`Unsupported cursor style: ${e}.`);
        return;
      }
    }
    this.lastCursorStyle = o, this.cursorHasOverride || (this.canvas.style.cursor = o);
  }
  syncModifier(e) {
    var _a2;
    const i = e.getModifierState(Ie.CAPS_LOCK), r = e.getModifierState(Ie.NUM_LOCK), n = e.getModifierState(Ie.SCROLL_LOCK), o = e.getModifierState(Ie.KANA_MODE);
    (_a2 = this.session) == null ? void 0 : _a2.synchronizeLockKeys(
      n,
      r,
      i,
      o
    );
  }
  updateModifierKeyState(e) {
    const i = Ht[e.code];
    this.modifierKeyPressed.indexOf(i) === -1 ? this.modifierKeyPressed.push(i) : e.type === "keyup" && this.modifierKeyPressed.splice(this.modifierKeyPressed.indexOf(i), 1);
  }
  doTransactionFromDeviceEvents(e) {
    var _a2;
    const i = new this.module.InputTransaction();
    e.forEach((r) => i.addEvent(r)), (_a2 = this.session) == null ? void 0 : _a2.applyInputs(i);
  }
  ctrlAltDel() {
    const e = parseInt("0x001D", 16), i = parseInt("0x0038", 16), r = parseInt("0xE053", 16);
    this.doTransactionFromDeviceEvents([
      this.module.DeviceEvent.keyPressed(e),
      this.module.DeviceEvent.keyPressed(i),
      this.module.DeviceEvent.keyPressed(r),
      this.module.DeviceEvent.keyReleased(e),
      this.module.DeviceEvent.keyReleased(i),
      this.module.DeviceEvent.keyReleased(r)
    ]);
  }
  sendMeta() {
    const e = parseInt("0xE05B", 16);
    this.doTransactionFromDeviceEvents([
      this.module.DeviceEvent.keyPressed(e),
      this.module.DeviceEvent.keyReleased(e)
    ]);
  }
  sendCtrlC() {
    const e = parseInt("0x001D", 16), i = parseInt("0x002E", 16);
    this.doTransactionFromDeviceEvents([
      this.module.DeviceEvent.keyPressed(e),
      this.module.DeviceEvent.keyPressed(i),
      this.module.DeviceEvent.keyReleased(i),
      this.module.DeviceEvent.keyReleased(e)
    ]);
  }
  sendCtrlV() {
    const e = parseInt("0x001D", 16), i = parseInt("0x002F", 16);
    this.doTransactionFromDeviceEvents([
      this.module.DeviceEvent.keyPressed(e),
      this.module.DeviceEvent.keyPressed(i),
      this.module.DeviceEvent.keyReleased(i),
      this.module.DeviceEvent.keyReleased(e)
    ]);
  }
}
class zn {
  constructor(e, i) {
    __publicField(this, "remoteDesktopService");
    __publicField(this, "clipboardService");
    this.remoteDesktopService = e, this.clipboardService = i;
  }
  configBuilder() {
    return this.remoteDesktopService.configBuilder();
  }
  connect(e) {
    return N.info("Initializing connection."), this.remoteDesktopService.connect(e);
  }
  ctrlAltDel() {
    this.remoteDesktopService.sendSpecialCombination(ue.CTRL_ALT_DEL);
  }
  metaKey() {
    this.remoteDesktopService.sendSpecialCombination(ue.META);
  }
  ctrlC() {
    this.remoteDesktopService.sendSpecialCombination(ue.CTRL_C);
  }
  ctrlV() {
    this.remoteDesktopService.sendSpecialCombination(ue.CTRL_V);
  }
  setVisibility(e) {
    N.info(`Change component visibility to: ${e}`), this.remoteDesktopService.setVisibility(e);
  }
  setScale(e) {
    this.remoteDesktopService.setScale(e);
  }
  shutdown() {
    this.remoteDesktopService.shutdown();
  }
  setKeyboardUnicodeMode(e) {
    this.remoteDesktopService.setKeyboardUnicodeMode(e);
  }
  setCursorStyleOverride(e) {
    this.remoteDesktopService.setCursorStyleOverride(e);
  }
  resize(e, i, r) {
    this.remoteDesktopService.resizeDynamic(e, i, r);
  }
  setEnableClipboard(e) {
    this.remoteDesktopService.setEnableClipboard(e);
  }
  setEnableAutoClipboard(e) {
    this.remoteDesktopService.setEnableAutoClipboard(e);
  }
  setOnWarningCallback(e) {
    this.remoteDesktopService.setOnWarningCallback(e);
  }
  setOnClipboardRemoteUpdateCallback(e) {
    this.remoteDesktopService.setOnClipboardRemoteUpdate(e);
  }
  async saveRemoteClipboardData() {
    return await this.clipboardService.saveRemoteClipboardData();
  }
  async sendClipboardData() {
    return await this.clipboardService.sendClipboardData();
  }
  invokeExtension(e) {
    return this.remoteDesktopService.invokeExtension(e);
  }
  enableFileTransfer(e) {
    const i = e.onUploadStarted, r = e.onUploadFinished;
    return e.onUploadStarted = () => {
      i == null ? void 0 : i(), this.clipboardService.suppressMonitoring();
    }, e.onUploadFinished = () => {
      this.clipboardService.resumeMonitoring(), r == null ? void 0 : r();
    }, this.remoteDesktopService.enableFileTransfer(e);
  }
  getExposedFunctions() {
    return {
      setVisibility: this.setVisibility.bind(this),
      configBuilder: this.configBuilder.bind(this),
      connect: this.connect.bind(this),
      onWarningCallback: this.setOnWarningCallback.bind(this),
      onClipboardRemoteUpdateCallback: this.setOnClipboardRemoteUpdateCallback.bind(this),
      setScale: this.setScale.bind(this),
      ctrlAltDel: this.ctrlAltDel.bind(this),
      metaKey: this.metaKey.bind(this),
      ctrlC: this.ctrlC.bind(this),
      ctrlV: this.ctrlV.bind(this),
      shutdown: this.shutdown.bind(this),
      setKeyboardUnicodeMode: this.setKeyboardUnicodeMode.bind(this),
      setCursorStyleOverride: this.setCursorStyleOverride.bind(this),
      resize: this.resize.bind(this),
      setEnableClipboard: this.setEnableClipboard.bind(this),
      setEnableAutoClipboard: this.setEnableAutoClipboard.bind(this),
      saveRemoteClipboardData: this.saveRemoteClipboardData.bind(this),
      sendClipboardData: this.sendClipboardData.bind(this),
      invokeExtension: this.invokeExtension.bind(this),
      enableFileTransfer: this.enableFileTransfer.bind(this)
    };
  }
}
const jt = ir(false);
function Bn() {
  const t = ir([]);
  return {
    subscribe: t.subscribe,
    enqueue(e) {
      t.update((i) => [...i, e]);
    },
    shift() {
      let e;
      return t.update((i) => i.length == 0 ? i : (e = i[0], i.slice(1))), e;
    },
    length() {
      return rr(t).length;
    }
  };
}
const Gt = Bn();
var W = /* @__PURE__ */ ((t) => (t[t.Full = 0] = "Full", t[t.TextOnly = 1] = "TextOnly", t[t.TextOnlyServerOnly = 2] = "TextOnlyServerOnly", t[t.None = 3] = "None", t))(W || {}), or = /* @__PURE__ */ ((t) => (t[t.General = 0] = "General", t[t.WrongPassword = 1] = "WrongPassword", t[t.LogonFailure = 2] = "LogonFailure", t[t.AccessDenied = 3] = "AccessDenied", t[t.RDCleanPath = 4] = "RDCleanPath", t[t.ProxyConnect = 5] = "ProxyConnect", t[t.NegotiationFailure = 6] = "NegotiationFailure", t))(or || {});
const In = 100;
function re(t) {
  throw {
    kind: () => or.General,
    backtrace: () => t
  };
}
class Wn {
  constructor(e, i) {
    __publicField(this, "remoteDesktopService");
    __publicField(this, "module");
    __publicField(this, "ClipboardApiSupported", W.None);
    __publicField(this, "lastClientClipboardItems", {});
    __publicField(this, "lastReceivedClipboardData", {});
    __publicField(this, "lastSentClipboardData", null);
    __publicField(this, "clipboardDataToSave", null);
    __publicField(this, "lastClipboardMonitorLoopError", null);
    // When true, the clipboard monitoring loop skips reading/sending clipboard updates.
    // Used to prevent the monitoring loop from clobbering an active file upload's
    // FormatList with a text/image clipboard update.
    __publicField(this, "monitoringSuppressed", false);
    // Firefox v126 and below does not support `navigator.clipboard.read` and `navigator.clipboard.write`.
    // So, we need to define specific methods to handle text-only clipboard.
    //
    // Also, Firefox v124 and below does not support `navigator.clipboard.readText`.
    // Because of this, we cannot read the data from the clipboard at all.
    __publicField(this, "ffClipboardDataToSave", null);
    this.remoteDesktopService = e, this.module = i;
  }
  /**
   * Suppress clipboard monitoring. While suppressed, the 100ms monitoring
   * loop will skip reading the local clipboard and sending updates to the
   * remote. This prevents the monitor from clobbering a file upload's
   * FormatList announcement with a text/image clipboard update.
   */
  suppressMonitoring() {
    this.monitoringSuppressed = true;
  }
  /**
   * Resume clipboard monitoring after a previous {@link suppressMonitoring} call.
   */
  resumeMonitoring() {
    this.monitoringSuppressed = false;
  }
  async initClipboard() {
    if (!window.isSecureContext) {
      this.remoteDesktopService.emitWarningEvent("Clipboard is available only in secure contexts (HTTPS).");
      return;
    }
    if (navigator.clipboard != null && (navigator.clipboard.read != null && navigator.clipboard.write != null ? this.ClipboardApiSupported = W.Full : navigator.clipboard.readText != null ? (this.ClipboardApiSupported = W.TextOnly, this.remoteDesktopService.emitWarningEvent(
      "Clipboard is limited to text-only data types due to an outdated browser version!"
    )) : navigator.clipboard.writeText != null && (this.ClipboardApiSupported = W.TextOnlyServerOnly, this.remoteDesktopService.emitWarningEvent(
      "Clipboard reading is not supported and writing is limited to text-only data types due to an outdated browser version!"
    ))), this.ClipboardApiSupported === W.Full)
      try {
        (await navigator.permissions.query({
          name: "clipboard-read"
        })).state === "denied" && (this.ClipboardApiSupported = W.TextOnly);
      } catch {
        try {
          await navigator.clipboard.read();
        } catch {
          this.ClipboardApiSupported = W.TextOnly;
        }
      }
    if (this.ClipboardApiSupported === W.None) {
      this.remoteDesktopService.emitWarningEvent(
        "Clipboard is not supported due to an outdated browser version!"
      );
      return;
    }
    this.remoteDesktopService.setOnForceClipboardUpdate(this.onForceClipboardUpdate.bind(this)), this.ClipboardApiSupported === W.Full ? this.remoteDesktopService.autoClipboard ? (this.remoteDesktopService.setOnRemoteClipboardChanged(this.onRemoteClipboardChangedAutoMode.bind(this)), this.remoteDesktopService.sessionStartedObservable.subscribe((e) => {
      this.scheduleOnMonitorClipboardUpdate();
    })) : this.remoteDesktopService.setOnRemoteClipboardChanged(
      this.onRemoteClipboardChangedManualMode.bind(this)
    ) : this.remoteDesktopService.setOnRemoteClipboardChanged(this.ffOnRemoteClipboardChanged.bind(this));
  }
  // Copies clipboard content received from the server to the local clipboard.
  // Returns the result of the operation. On failure, it additionally raises an error session event.
  async saveRemoteClipboardData() {
    if (this.ClipboardApiSupported !== W.Full)
      return await this.ffSaveRemoteClipboardData();
    this.clipboardDataToSave == null && re("The server did not send the clipboard data.");
    try {
      const e = this.clipboardDataToRecord(this.clipboardDataToSave), i = new ClipboardItem(e);
      await navigator.clipboard.write([i]), this.clipboardDataToSave = null;
    } catch (e) {
      re("Failed to write to the clipboard: " + e);
    }
  }
  // Sends local clipboard's content to the server.
  // Returns the result of the operation. On failure, it additionally raises an error session event.
  async sendClipboardData() {
    if (this.ClipboardApiSupported !== W.Full)
      return await this.ffSendClipboardData();
    const e = await navigator.clipboard.read().catch((n) => {
      re("Failed to read from the clipboard: " + n);
    });
    e.length == 0 && re("The clipboard has no data.");
    const i = e[0];
    i.types.some((n) => n.startsWith("text/") || n.startsWith("image/png")) || re("The clipboard has no data of supported type (text or image).");
    const r = new this.module.ClipboardData();
    for (const n of i.types) {
      const o = n.startsWith("text/"), c = await i.getType(n);
      o ? r.addText(n, await c.text()) : r.addBinary(n, new Uint8Array(await c.arrayBuffer()));
    }
    r.isEmpty() || (this.lastSentClipboardData = r, await this.remoteDesktopService.onClipboardChanged(r));
  }
  scheduleOnMonitorClipboardUpdate() {
    setTimeout(this.onMonitorClipboard.bind(this), In);
  }
  runWhenWindowFocused(e) {
    document.hasFocus() ? e() : Gt.enqueue(e);
  }
  // This function is required to convert `ClipboardData` to an object that can be used
  // with `ClipboardItem` API.
  clipboardDataToRecord(e) {
    const i = {};
    for (const r of e.items()) {
      const n = r.mimeType();
      i[n] = new Blob([r.value()], { type: n });
    }
    return i;
  }
  clipboardDataToClipboardItemsRecord(e) {
    const i = {};
    for (const r of e.items()) {
      const n = r.mimeType();
      i[n] = r.value();
    }
    return i;
  }
  // This callback is required to send initial clipboard state if available.
  onForceClipboardUpdate() {
    try {
      this.lastSentClipboardData ? this.remoteDesktopService.onClipboardChanged(this.lastSentClipboardData) : this.remoteDesktopService.onClipboardChangedEmpty();
    } catch (e) {
      console.error("Failed to send initial clipboard state: " + e);
    }
  }
  // This callback is required to update client clipboard state when remote side has changed.
  onRemoteClipboardChangedManualMode(e) {
    this.clipboardDataToSave = e, this.remoteDesktopService.emitClipboardRemoteUpdateEvent();
  }
  // This callback is required to update client clipboard state when remote side has changed.
  onRemoteClipboardChangedAutoMode(e) {
    try {
      const i = this.clipboardDataToRecord(e), r = new ClipboardItem(i);
      this.runWhenWindowFocused(() => {
        this.lastReceivedClipboardData = this.clipboardDataToClipboardItemsRecord(e), navigator.clipboard.write([r]);
      });
    } catch (i) {
      console.error("Failed to set client clipboard: " + i);
    }
  }
  // Called periodically to monitor clipboard changes
  async onMonitorClipboard() {
    let e = false;
    try {
      if (this.monitoringSuppressed || !document.hasFocus())
        return;
      const i = await navigator.clipboard.read();
      if (i.length == 0)
        return;
      const r = i[0];
      if (!r.types.some((c) => c.startsWith("text/") || c.startsWith("image/png")))
        return;
      const n = {};
      let o = true;
      for (const c of r.types) {
        const h = c.startsWith("text/"), f = await r.getType(c), d = h ? await f.text() : new Uint8Array(await f.arrayBuffer()), v = h ? function(s, u) {
          return s === u;
        } : function(s, u) {
          return !(s instanceof Uint8Array) || !(u instanceof Uint8Array) ? false : s.length === u.length && s.every((a, l) => a === u[l]);
        }, w = this.lastClientClipboardItems[c];
        v(w, d) || (v(this.lastReceivedClipboardData[c], d) ? this.lastClientClipboardItems[c] = this.lastReceivedClipboardData[c] : o = false), n[c] = d;
      }
      if (!o) {
        this.lastClientClipboardItems = n;
        const c = new this.module.ClipboardData();
        Object.entries(n).forEach(([h, f]) => {
          f != null && (h.startsWith("text/") && typeof f == "string" ? c.addText(h, f) : h.startsWith("image/") && f instanceof Uint8Array && c.addBinary(h, f));
        }), c.isEmpty() || (this.lastSentClipboardData = c, await this.remoteDesktopService.onClipboardChanged(c));
      }
    } catch (i) {
      if (i instanceof DOMException && i.name === "NotAllowedError") {
        console.warn("Clipboard monitoring disabled: browser requires user activation for clipboard read."), this.remoteDesktopService.setOnRemoteClipboardChanged(
          this.onRemoteClipboardChangedManualMode.bind(this)
        ), e = true;
        return;
      }
      i instanceof Error && ((this.lastClipboardMonitorLoopError === null || this.lastClipboardMonitorLoopError.toString() !== i.toString()) && console.error("Clipboard monitoring error: " + i), this.lastClipboardMonitorLoopError = i);
    } finally {
      !e && !rr(jt) && this.scheduleOnMonitorClipboardUpdate();
    }
  }
  // This function is required to retrieve the text data from the `ClipboardData`.
  ffRetrieveTextData(e) {
    for (const i of e.items())
      if (i.mimeType().startsWith("text/")) {
        const r = i.value();
        if (typeof r == "string") return r;
      }
    return "";
  }
  // Firefox specific function.
  // This callback is required to update client clipboard state when remote side has changed.
  ffOnRemoteClipboardChanged(e) {
    const i = this.ffRetrieveTextData(e);
    i !== "" && (this.ffClipboardDataToSave = i, this.remoteDesktopService.emitClipboardRemoteUpdateEvent());
  }
  // Firefox specific function. We are using text-only clipboard API here.
  //
  // Copies clipboard content received from the server to the local clipboard.
  // Returns the result of the operation. On failure, it additionally raises an error session event.
  async ffSaveRemoteClipboardData() {
    this.ffClipboardDataToSave == null && re("The server did not send the clipboard data.");
    try {
      await navigator.clipboard.writeText(this.ffClipboardDataToSave), this.ffClipboardDataToSave = null;
    } catch (e) {
      re("Failed to write to the clipboard: " + e);
    }
  }
  // Firefox specific function. We are using text-only clipboard API here.
  //
  // Sends local clipboard's content to the server.
  // Returns the result of the operation. On failure, it additionally raises an error session event.
  async ffSendClipboardData() {
    this.ClipboardApiSupported !== W.TextOnly && re("The browser does not support clipboard read.");
    const e = await navigator.clipboard.readText().catch((r) => {
      re("Failed to read from the clipboard: " + r);
    });
    e.length == 0 && re("The clipboard has no data.");
    const i = new this.module.ClipboardData();
    i.addText("text/plain", e), i.isEmpty() || (this.lastSentClipboardData = i, await this.remoteDesktopService.onClipboardChanged(i));
  }
}
var Vn = (t, e) => e(t, true), Kn = (t, e) => e(t, false), qn = (t) => t.preventDefault(), Hn = /* @__PURE__ */ hn('<div class="svelte-1103xra"><div><div class="screen-viewer svelte-1103xra"><canvas id="renderer" tabindex="0" class="svelte-1103xra"></canvas></div></div></div>');
const jn = {
  hash: "svelte-1103xra",
  code: ".screen-wrapper.svelte-1103xra {position:relative;}.capturing-inputs.svelte-1103xra {outline:1px solid rgba(0, 97, 166, 0.7);outline-offset:-1px;}canvas.svelte-1103xra {width:100%;height:100%;}.svelte-1103xra::selection {background-color:transparent;}.screen-wrapper.hidden.svelte-1103xra {pointer-events:none !important;position:absolute !important;visibility:hidden;height:100%;width:100%;transform:translate(-100%, -100%);}"
};
function ar(t, e) {
  Gi(e, true), vn(t, jn);
  let i = ut(e, "scale"), r = ut(e, "verbose"), n = ut(e, "flexcenter"), o = ut(e, "module"), c = Ft(false), h = () => {
    const b = f == null ? void 0 : f.getRootNode(), C = b instanceof ShadowRoot ? b.host : null;
    return C != null && document.activeElement === C;
  }, f, d, v, w, s = Ft(""), u = Ft(""), a = new Un(o()), l = new Wn(a, o()), p = new zn(a, l), O = be.Fit;
  function A(b) {
    h() && Oe(b);
  }
  function g() {
    De(), de(), window.addEventListener("keydown", A, false), window.addEventListener("keyup", A, false), window.addEventListener("focus", fe), window.addEventListener("blur", Fe), document.addEventListener("visibilitychange", he);
    const b = Le();
    b != null && typeof ResizeObserver < "u" && (w = new ResizeObserver(() => oe(O)), w.observe(b));
  }
  function _() {
    n() === "true" && (f.style.flexGrow = "", f.style.display = "", f.style.justifyContent = "", f.style.alignItems = "");
  }
  function M(b) {
    n() === "true" && (f.style.flexGrow = "1", f.style.display = "flex", f.style.justifyContent = "center", f.style.alignItems = "center");
  }
  function F(b, C, L) {
    let S = `height: ${b}; width: ${C}`;
    S = `${S}; max-height: ${b}; max-width: ${C}; min-height: ${b}; min-width: ${C}`, K(s, Ee(S));
  }
  function G(b, C, L) {
    K(u, `height: ${b}; width: ${C}; overflow: ${L}`);
  }
  const Se = (b) => {
    oe(i());
  };
  function De() {
    a.resizeObservable.subscribe((b) => {
      N.info(`Resize canvas to: ${b.desktopSize.width}x${b.desktopSize.height}`), v.width = b.desktopSize.width, v.height = b.desktopSize.height, oe(i());
    });
  }
  function de() {
    window.addEventListener("resize", Se), a.scaleObservable.subscribe((b) => {
      N.info("Change scale!"), oe(b);
    }), a.dynamicResizeObservable.subscribe((b) => {
      N.info(`Dynamic resize!, width: ${b.width}, height: ${b.height}`), F(b.height.toString() + "px", b.width.toString() + "px");
    }), a.changeVisibilityObservable.subscribe((b) => {
      K(c, Ee(b)), b && (G("100%", "100%", "hidden"), setTimeout(() => oe(i()), 150));
    });
  }
  function it() {
    oe(O);
  }
  function oe(b) {
    if (_(), U(c))
      switch (b) {
        case "fit":
        case be.Fit:
          N.info("Size to fit"), O = be.Fit, i("fit"), Re();
          break;
        case "full":
        case be.Full:
          N.info("Size to full"), O = be.Full, Te(), i("full");
          break;
        case "real":
        case be.Real:
          N.info("Size to real"), O = be.Real, Ot(), i("real");
          break;
      }
  }
  function Te() {
    const b = Ae(), C = b.x, L = b.y;
    let S = v.width, $ = v.height;
    const ee = Math.min(C / v.width, L / v.height);
    S = S * ee, $ = $ * ee, G(`${L}px`, `${C}px`, "hidden"), S = S > 0 ? S : 0, $ = $ > 0 ? $ : 0, F(`${$}px`, `${S}px`);
  }
  function Re(b = false) {
    const { x: C, y: L } = Me();
    let S = v.width, $ = v.height;
    if (!b || C < v.width || L < v.height) {
      const ee = Math.min(C / v.width, L / v.height);
      S = S * ee, $ = $ * ee;
    }
    S = S > 0 ? S : 0, $ = $ > 0 ? $ : 0, G("initial", "initial", "hidden"), F(`${$}px`, `${S}px`), M();
  }
  function Ot() {
    const { x: b, y: C } = Me();
    b < v.width || C < v.height ? G(`${Math.min(C, v.height)}px`, `${Math.min(b, v.width)}px`, "auto") : G("initial", "initial", "initial"), F(`${v.height}px`, `${v.width}px`), M();
  }
  function $e(b) {
    const C = v == null ? void 0 : v.getBoundingClientRect(), L = (v == null ? void 0 : v.width) / C.width, S = (v == null ? void 0 : v.height) / C.height, $ = {
      x: Math.round((b.clientX - C.left) * L),
      y: Math.round((b.clientY - C.top) * S)
    };
    a.updateMousePosition($);
  }
  function xe(b, C) {
    a.mouseButtonState(b, C, true);
  }
  function rt(b) {
    a.mouseWheel(b);
  }
  function nt(b) {
    v.focus({ preventScroll: true }), a.mouseIn(b);
  }
  function At(b) {
    a.mouseOut(b);
  }
  function Oe(b) {
    return a.sendKeyboardEvent(b), true;
  }
  function Ae() {
    const b = window, C = document, L = C.documentElement, S = C.getElementsByTagName("body")[0], $ = b.innerWidth ?? L.clientWidth ?? S.clientWidth, ee = b.innerHeight ?? L.clientHeight ?? S.clientHeight;
    return { x: $, y: ee };
  }
  function Le() {
    var _a2;
    const b = f == null ? void 0 : f.getRootNode();
    return ((_a2 = b instanceof ShadowRoot ? b.host : null) == null ? void 0 : _a2.parentElement) ?? null;
  }
  function Me() {
    const b = Le();
    if (b != null) {
      const S = b.getBoundingClientRect();
      if (S.width > 0 && S.height > 0)
        return { x: S.width, y: S.height };
    }
    const C = Ae(), L = d.getBoundingClientRect();
    return {
      x: C.x - L.x,
      y: C.y - L.y
    };
  }
  async function st() {
    N.info("Start canvas initialization..."), v.width = 800, v.height = 600, a.setCanvas(v), a.setOnCanvasResized(it), g();
    let b = {
      irgUserInteraction: p.getExposedFunctions()
    };
    N.info("Component ready"), N.info("Dispatching ready event"), f.dispatchEvent(new CustomEvent("ready", {
      detail: b,
      bubbles: true,
      composed: true
    }));
  }
  function fe() {
    var _a2;
    try {
      for (; Gt.length() > 0; )
        (_a2 = Gt.shift()) == null ? void 0 : _a2();
    } catch (b) {
      console.error("Failed to run the function queued for execution when the window received focus: " + b);
    }
  }
  function Fe() {
    a.focusLost();
  }
  function he() {
    document.visibilityState === "hidden" && a.focusLost();
  }
  tr(async () => {
    jt.set(false), N.verbose = r() === "true", N.info("Dom ready"), await st(), await l.initClipboard();
  }), _n(() => {
    w == null ? void 0 : w.disconnect(), window.removeEventListener("resize", Se), window.removeEventListener("keydown", A, false), window.removeEventListener("keyup", A, false), window.removeEventListener("focus", fe), window.removeEventListener("blur", Fe), document.removeEventListener("visibilitychange", he), jt.set(true);
  });
  var ye = Hn(), Y = Pt(ye);
  let Ne;
  var Ce = Pt(Y), H = Pt(Ce);
  return H.__mousemove = $e, H.__mousedown = [Vn, xe], H.__mouseup = [Kn, xe], H.__contextmenu = [qn], Ut(H, (b) => v = b, () => v), Nt(Ce), Nt(Y), Ut(Y, (b) => d = b, () => d), Nt(ye), Ut(ye, (b) => f = b, () => f), en(() => {
    Ne = mn(Y, 1, `screen-wrapper scale-${i() ?? ""}`, "svelte-1103xra", Ne, {
      hidden: !U(c),
      "capturing-inputs": h
    }), fi(Y, "style", U(u)), fi(Ce, "style", U(s));
  }), lt("mouseleave", H, (b) => {
    At(b);
  }), lt("mouseenter", H, (b) => {
    nt(b);
  }), lt("wheel", H, rt), lt("selectstart", H, (b) => {
    b.preventDefault();
  }), Qi(t, ye), Yi({
    get scale() {
      return i();
    },
    set scale(b) {
      i(b), Ge();
    },
    get verbose() {
      return r();
    },
    set verbose(b) {
      r(b), Ge();
    },
    get flexcenter() {
      return n();
    },
    set flexcenter(b) {
      n(b), Ge();
    },
    get module() {
      return o();
    },
    set module(b) {
      o(b), Ge();
    }
  });
}
dn([
  "mousemove",
  "mousedown",
  "mouseup",
  "contextmenu"
]);
customElements.define("iron-remote-desktop", kn(
  ar,
  {
    scale: {},
    verbose: {},
    flexcenter: {},
    module: {}
  },
  [],
  [],
  false,
  (t) => class extends t {
    constructor() {
      super(), this.attachShadow({ mode: "open", delegatesFocus: true });
    }
  }
));
const Gn = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ar
}, Symbol.toStringTag, { value: "Module" }));
export {
  Nn as Config,
  Pn as ConfigBuilder,
  Gn as default
};
