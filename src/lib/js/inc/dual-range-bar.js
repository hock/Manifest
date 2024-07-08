! function(t, e) {
	"object" == typeof exports && "object" == typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define("dual-range-bar", [], e) : "object" == typeof exports ? exports["dual-range-bar"] = e() : t["dual-range-bar"] = e()
}(self, (function() {
	return (() => {
		"use strict";
		var t = {
				426: (t, e, n) => {
					n.d(e, {
						Z: () => o
					});
					var r = n(645),
						i = n.n(r)()((function(t) {
							return t[1]
						}));
					i.push([t.id, ".drbar-container {\n  /* Colors */\n  --slider-color: #FFFFFF;\n  --range-color: #eeeeee;\n  --bg-color: #aaaaaa44;\n  --slider-active: #4d34db;\n  --range-active: #5da8d6;\n  /* Sizes */\n  --slider-wh: 20px;\n  --range-thick: 15px;\n  --bg-thick: 10px;\n  --mini-thick: 4px;\n  --mini-ratio: calc(4/15);\n}\n.drbar-container.drbar-small {\n  --slider-wh: 12px;\n  --range-thick: 10px;\n  --bg-thick: 6px;\n  --mini-thick: 4px;\n  --mini-ratio: calc(4/10);\n}\n.drbar-container.drbar-large {\n  --slider-wh: 25px;\n  --range-thick: 20px;\n  --bg-thick: 12px;\n  --mini-thick: 6px;\n  --mini-ratio: calc(6/20);\n}\n.drbar-container.drbar-huge {\n  --slider-wh: 32px;\n  --range-thick: 24px;\n  --bg-thick: 16px;\n  --mini-thick: 8px;\n  --mini-ratio: calc(8/24);\n}\n\n.drbar-container,\n.drbar-container .drbar-bg,\n.drbar-container .drbar-slider,\n.drbar-container .drbar-range {\n  user-select: none;\n  touch-action: none;\n  -webkit-user-drag: none;\n  -webkit-user-select: none;\n  -webkit-touch-callout: none;\n}\n\n/* Slider rules */\n.drbar-container .drbar-slider {\n box-shadow:0.1rem 0.1rem rgba(0,0,0,0.2);\n width: var(--slider-wh); height: var(--slider-wh);\n  border-radius: 50%;\n  z-index: 2;\n  transition: background-color 400ms, transform 400ms, opacity 200ms;\n}\n.drbar-container .drbar-slider:not(:active) {\n  background-color: var(--slider-color);\n}\n.drbar-container .drbar-slider:active {\n  background-color: var(--slider-active);\n  transform: scale(1.1);\n  transition: transform 100ms;\n}\n.drbar-container.drbar-minimizes:not(:hover) .drbar-slider {\n  transform: scale(0.25); opacity: 0;\n}\n\n/* Range bar rules */\n.drbar-container .drbar-range {\n  cursor: move;\n  z-index: 1;\n  transition: background-color 400ms, transform 400ms, opacity 400ms;\n}\n.drbar-container.drbar-horizontal .drbar-range {\n  height: var(--range-thick);\n  border-radius: 2px/50%;\n}\n.drbar-container.drbar-vertical .drbar-range {\n  width: var(--range-thick);\n  border-radius: 50%/2px;\n}\n.drbar-container .drbar-range:not(:active) {\n  background-color: var(--range-color);\n}\n.drbar-container .drbar-range:active {\n  background-color: var(--range-active);\n}\n.drbar-container.drbar-horizontal.drbar-minimizes:not(:hover) .drbar-range {\n  transform: scaleY(var(--mini-ratio)); opacity: 0.5;\n}\n.drbar-container.drbar-vertical.drbar-minimizes:not(:hover) .drbar-range {\n  transform: scaleX(var(--mini-ratio)); opacity: 0.5;\n}\n\n/* Background rules */\n.drbar-container.drbar-horizontal .drbar-bg {\n  height: var(--bg-thick);\n  cursor: ew-resize;\n}\n.drbar-container.drbar-vertical .drbar-bg {\n  width: var(--bg-thick);\n  cursor: ns-resize;\n}\n.drbar-container .drbar-bg::before {\n  content: '';\n  display: block;\n  position: absolute;\n  border-radius: calc(var(--bg-thick)/2);\n  z-index: 0;\n  background: var(--bg-color);\n  transition: background-color 400ms, height 400ms, width 400ms, opacity 400ms;\n}\n.drbar-container.drbar-horizontal .drbar-bg::before {\n  top: 50%;\n  width: 100%; height: var(--bg-thick);\n  transform: translateY(-50%);\n}\n.drbar-container.drbar-horizontal.drbar-minimizes:not(:hover) .drbar-bg::before {\n  height: var(--mini-thick); opacity: 0;\n}\n\n.drbar-container.drbar-vertical .drbar-bg::before {\n  left: 50%;\n  width: var(--bg-thick); height: 100%;\n  transform: translateX(-50%);\n}\n.drbar-container.drbar-vertical.drbar-minimizes:not(:hover) .drbar-bg::before {\n  width: var(--mini-thick); opacity: 0;\n}", ""]);
					const o = i
				},
				645: t => {
					t.exports = function(t) {
						var e = [];
						return e.toString = function() {
							return this.map((function(e) {
								var n = t(e);
								return e[2] ? "@media ".concat(e[2], " {").concat(n, "}") : n
							})).join("")
						}, e.i = function(t, n, r) {
							"string" == typeof t && (t = [
								[null, t, ""]
							]);
							var i = {};
							if (r)
								for (var o = 0; o < this.length; o++) {
									var a = this[o][0];
									null != a && (i[a] = !0)
								}
							for (var s = 0; s < t.length; s++) {
								var d = [].concat(t[s]);
								r && i[d[0]] || (n && (d[2] ? d[2] = "".concat(n, " and ").concat(d[2]) : d[2] = n), e.push(d))
							}
						}, e
					}
				},
				33: (t, e, n) => {
					n.r(e), n.d(e, {
						default: () => E
					});
					var r = function() {
							if ("undefined" != typeof Map) return Map;

							function t(t, e) {
								var n = -1;
								return t.some((function(t, r) {
									return t[0] === e && (n = r, !0)
								})), n
							}
							return function() {
								function e() {
									this.__entries__ = []
								}
								return Object.defineProperty(e.prototype, "size", {
									get: function() {
										return this.__entries__.length
									},
									enumerable: !0,
									configurable: !0
								}), e.prototype.get = function(e) {
									var n = t(this.__entries__, e),
										r = this.__entries__[n];
									return r && r[1]
								}, e.prototype.set = function(e, n) {
									var r = t(this.__entries__, e);
									~r ? this.__entries__[r][1] = n : this.__entries__.push([e, n])
								}, e.prototype.delete = function(e) {
									var n = this.__entries__,
										r = t(n, e);
									~r && n.splice(r, 1)
								}, e.prototype.has = function(e) {
									return !!~t(this.__entries__, e)
								}, e.prototype.clear = function() {
									this.__entries__.splice(0)
								}, e.prototype.forEach = function(t, e) {
									void 0 === e && (e = null);
									for (var n = 0, r = this.__entries__; n < r.length; n++) {
										var i = r[n];
										t.call(e, i[1], i[0])
									}
								}, e
							}()
						}(),
						i = "undefined" != typeof window && "undefined" != typeof document && window.document === document,
						o = void 0 !== n.g && n.g.Math === Math ? n.g : "undefined" != typeof self && self.Math === Math ? self : "undefined" != typeof window && window.Math === Math ? window : Function("return this")(),
						a = "function" == typeof requestAnimationFrame ? requestAnimationFrame.bind(o) : function(t) {
							return setTimeout((function() {
								return t(Date.now())
							}), 1e3 / 60)
						};
					var s = ["top", "right", "bottom", "left", "width", "height", "size", "weight"],
						d = "undefined" != typeof MutationObserver,
						l = function() {
							function t() {
								this.connected_ = !1, this.mutationEventsAdded_ = !1, this.mutationsObserver_ = null, this.observers_ = [], this.onTransitionEnd_ = this.onTransitionEnd_.bind(this), this.refresh = function(t, e) {
									var n = !1,
										r = !1,
										i = 0;

									function o() {
										n && (n = !1, t()), r && d()
									}

									function s() {
										a(o)
									}

									function d() {
										var t = Date.now();
										if (n) {
											if (t - i < 2) return;
											r = !0
										} else n = !0, r = !1, setTimeout(s, e);
										i = t
									}
									return d
								}(this.refresh.bind(this), 20)
							}
							return t.prototype.addObserver = function(t) {
								~this.observers_.indexOf(t) || this.observers_.push(t), this.connected_ || this.connect_()
							}, t.prototype.removeObserver = function(t) {
								var e = this.observers_,
									n = e.indexOf(t);
								~n && e.splice(n, 1), !e.length && this.connected_ && this.disconnect_()
							}, t.prototype.refresh = function() {
								this.updateObservers_() && this.refresh()
							}, t.prototype.updateObservers_ = function() {
								var t = this.observers_.filter((function(t) {
									return t.gatherActive(), t.hasActive()
								}));
								return t.forEach((function(t) {
									return t.broadcastActive()
								})), t.length > 0
							}, t.prototype.connect_ = function() {
								i && !this.connected_ && (document.addEventListener("transitionend", this.onTransitionEnd_), window.addEventListener("resize", this.refresh), d ? (this.mutationsObserver_ = new MutationObserver(this.refresh), this.mutationsObserver_.observe(document, {
									attributes: !0,
									childList: !0,
									characterData: !0,
									subtree: !0
								})) : (document.addEventListener("DOMSubtreeModified", this.refresh), this.mutationEventsAdded_ = !0), this.connected_ = !0)
							}, t.prototype.disconnect_ = function() {
								i && this.connected_ && (document.removeEventListener("transitionend", this.onTransitionEnd_), window.removeEventListener("resize", this.refresh), this.mutationsObserver_ && this.mutationsObserver_.disconnect(), this.mutationEventsAdded_ && document.removeEventListener("DOMSubtreeModified", this.refresh), this.mutationsObserver_ = null, this.mutationEventsAdded_ = !1, this.connected_ = !1)
							}, t.prototype.onTransitionEnd_ = function(t) {
								var e = t.propertyName,
									n = void 0 === e ? "" : e;
								s.some((function(t) {
									return !!~n.indexOf(t)
								})) && this.refresh()
							}, t.getInstance = function() {
								return this.instance_ || (this.instance_ = new t), this.instance_
							}, t.instance_ = null, t
						}(),
						c = function(t, e) {
							for (var n = 0, r = Object.keys(e); n < r.length; n++) {
								var i = r[n];
								Object.defineProperty(t, i, {
									value: e[i],
									enumerable: !1,
									writable: !1,
									configurable: !0
								})
							}
							return t
						},
						u = function(t) {
							return t && t.ownerDocument && t.ownerDocument.defaultView || o
						},
						h = b(0, 0, 0, 0);

					function p(t) {
						return parseFloat(t) || 0
					}

					function v(t) {
						for (var e = [], n = 1; n < arguments.length; n++) e[n - 1] = arguments[n];
						return e.reduce((function(e, n) {
							return e + p(t["border-" + n + "-width"])
						}), 0)
					}

					function f(t) {
						var e = t.clientWidth,
							n = t.clientHeight;
						if (!e && !n) return h;
						var r = u(t).getComputedStyle(t),
							i = function(t) {
								for (var e = {}, n = 0, r = ["top", "right", "bottom", "left"]; n < r.length; n++) {
									var i = r[n],
										o = t["padding-" + i];
									e[i] = p(o)
								}
								return e
							}(r),
							o = i.left + i.right,
							a = i.top + i.bottom,
							s = p(r.width),
							d = p(r.height);
						if ("border-box" === r.boxSizing && (Math.round(s + o) !== e && (s -= v(r, "left", "right") + o), Math.round(d + a) !== n && (d -= v(r, "top", "bottom") + a)), ! function(t) {
								return t === u(t).document.documentElement
							}(t)) {
							var l = Math.round(s + o) - e,
								c = Math.round(d + a) - n;
							1 !== Math.abs(l) && (s -= l), 1 !== Math.abs(c) && (d -= c)
						}
						return b(i.left, i.top, s, d)
					}
					var g = "undefined" != typeof SVGGraphicsElement ? function(t) {
						return t instanceof u(t).SVGGraphicsElement
					} : function(t) {
						return t instanceof u(t).SVGElement && "function" == typeof t.getBBox
					};

					function m(t) {
						return i ? g(t) ? function(t) {
							var e = t.getBBox();
							return b(0, 0, e.width, e.height)
						}(t) : f(t) : h
					}

					function b(t, e, n, r) {
						return {
							x: t,
							y: e,
							width: n,
							height: r
						}
					}
					var w = function() {
							function t(t) {
								this.broadcastWidth = 0, this.broadcastHeight = 0, this.contentRect_ = b(0, 0, 0, 0), this.target = t
							}
							return t.prototype.isActive = function() {
								var t = m(this.target);
								return this.contentRect_ = t, t.width !== this.broadcastWidth || t.height !== this.broadcastHeight
							}, t.prototype.broadcastRect = function() {
								var t = this.contentRect_;
								return this.broadcastWidth = t.width, this.broadcastHeight = t.height, t
							}, t
						}(),
						y = function(t, e) {
							var n, r, i, o, a, s, d, l = (r = (n = e).x, i = n.y, o = n.width, a = n.height, s = "undefined" != typeof DOMRectReadOnly ? DOMRectReadOnly : Object, d = Object.create(s.prototype), c(d, {
								x: r,
								y: i,
								width: o,
								height: a,
								top: i,
								right: r + o,
								bottom: a + i,
								left: r
							}), d);
							c(this, {
								target: t,
								contentRect: l
							})
						},
						S = function() {
							function t(t, e, n) {
								if (this.activeObservations_ = [], this.observations_ = new r, "function" != typeof t) throw new TypeError("The callback provided as parameter 1 is not a function.");
								this.callback_ = t, this.controller_ = e, this.callbackCtx_ = n
							}
							return t.prototype.observe = function(t) {
								if (!arguments.length) throw new TypeError("1 argument required, but only 0 present.");
								if ("undefined" != typeof Element && Element instanceof Object) {
									if (!(t instanceof u(t).Element)) throw new TypeError('parameter 1 is not of type "Element".');
									var e = this.observations_;
									e.has(t) || (e.set(t, new w(t)), this.controller_.addObserver(this), this.controller_.refresh())
								}
							}, t.prototype.unobserve = function(t) {
								if (!arguments.length) throw new TypeError("1 argument required, but only 0 present.");
								if ("undefined" != typeof Element && Element instanceof Object) {
									if (!(t instanceof u(t).Element)) throw new TypeError('parameter 1 is not of type "Element".');
									var e = this.observations_;
									e.has(t) && (e.delete(t), e.size || this.controller_.removeObserver(this))
								}
							}, t.prototype.disconnect = function() {
								this.clearActive(), this.observations_.clear(), this.controller_.removeObserver(this)
							}, t.prototype.gatherActive = function() {
								var t = this;
								this.clearActive(), this.observations_.forEach((function(e) {
									e.isActive() && t.activeObservations_.push(e)
								}))
							}, t.prototype.broadcastActive = function() {
								if (this.hasActive()) {
									var t = this.callbackCtx_,
										e = this.activeObservations_.map((function(t) {
											return new y(t.target, t.broadcastRect())
										}));
									this.callback_.call(t, e, t), this.clearActive()
								}
							}, t.prototype.clearActive = function() {
								this.activeObservations_.splice(0)
							}, t.prototype.hasActive = function() {
								return this.activeObservations_.length > 0
							}, t
						}(),
						_ = "undefined" != typeof WeakMap ? new WeakMap : new r,
						x = function t(e) {
							if (!(this instanceof t)) throw new TypeError("Cannot call a class as a function.");
							if (!arguments.length) throw new TypeError("1 argument required, but only 0 present.");
							var n = l.getInstance(),
								r = new S(e, n, this);
							_.set(this, r)
						};
					["observe", "unobserve", "disconnect"].forEach((function(t) {
						x.prototype[t] = function() {
							var e;
							return (e = _.get(this))[t].apply(e, arguments)
						}
					}));
					const E = void 0 !== o.ResizeObserver ? o.ResizeObserver : x
				},
				654: (t, e, n) => {
					n.r(e), n.d(e, {
						default: () => s
					});
					var r = n(379),
						i = n.n(r),
						o = n(426),
						a = {
							insert: "head",
							singleton: !1
						};
					i()(o.Z, a);
					const s = o.Z.locals || {}
				},
				379: (t, e, n) => {
					var r, i = function() {
							return void 0 === r && (r = Boolean(window && document && document.all && !window.atob)), r
						},
						o = function() {
							var t = {};
							return function(e) {
								if (void 0 === t[e]) {
									var n = document.querySelector(e);
									if (window.HTMLIFrameElement && n instanceof window.HTMLIFrameElement) try {
										n = n.contentDocument.head
									} catch (t) {
										n = null
									}
									t[e] = n
								}
								return t[e]
							}
						}(),
						a = [];

					function s(t) {
						for (var e = -1, n = 0; n < a.length; n++)
							if (a[n].identifier === t) {
								e = n;
								break
							} return e
					}

					function d(t, e) {
						for (var n = {}, r = [], i = 0; i < t.length; i++) {
							var o = t[i],
								d = e.base ? o[0] + e.base : o[0],
								l = n[d] || 0,
								c = "".concat(d, " ").concat(l);
							n[d] = l + 1;
							var u = s(c),
								h = {
									css: o[1],
									media: o[2],
									sourceMap: o[3]
								}; - 1 !== u ? (a[u].references++, a[u].updater(h)) : a.push({
								identifier: c,
								updater: g(h, e),
								references: 1
							}), r.push(c)
						}
						return r
					}

					function l(t) {
						var e = document.createElement("style"),
							r = t.attributes || {};
						if (void 0 === r.nonce) {
							var i = n.nc;
							i && (r.nonce = i)
						}
						if (Object.keys(r).forEach((function(t) {
								e.setAttribute(t, r[t])
							})), "function" == typeof t.insert) t.insert(e);
						else {
							var a = o(t.insert || "head");
							if (!a) throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
							a.appendChild(e)
						}
						return e
					}
					var c, u = (c = [], function(t, e) {
						return c[t] = e, c.filter(Boolean).join("\n")
					});

					function h(t, e, n, r) {
						var i = n ? "" : r.media ? "@media ".concat(r.media, " {").concat(r.css, "}") : r.css;
						if (t.styleSheet) t.styleSheet.cssText = u(e, i);
						else {
							var o = document.createTextNode(i),
								a = t.childNodes;
							a[e] && t.removeChild(a[e]), a.length ? t.insertBefore(o, a[e]) : t.appendChild(o)
						}
					}

					function p(t, e, n) {
						var r = n.css,
							i = n.media,
							o = n.sourceMap;
						if (i ? t.setAttribute("media", i) : t.removeAttribute("media"), o && "undefined" != typeof btoa && (r += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(o)))), " */")), t.styleSheet) t.styleSheet.cssText = r;
						else {
							for (; t.firstChild;) t.removeChild(t.firstChild);
							t.appendChild(document.createTextNode(r))
						}
					}
					var v = null,
						f = 0;

					function g(t, e) {
						var n, r, i;
						if (e.singleton) {
							var o = f++;
							n = v || (v = l(e)), r = h.bind(null, n, o, !1), i = h.bind(null, n, o, !0)
						} else n = l(e), r = p.bind(null, n, e), i = function() {
							! function(t) {
								if (null === t.parentNode) return !1;
								t.parentNode.removeChild(t)
							}(n)
						};
						return r(t),
							function(e) {
								if (e) {
									if (e.css === t.css && e.media === t.media && e.sourceMap === t.sourceMap) return;
									r(t = e)
								} else i()
							}
					}
					t.exports = function(t, e) {
						(e = e || {}).singleton || "boolean" == typeof e.singleton || (e.singleton = i());
						var n = d(t = t || [], e);
						return function(t) {
							if (t = t || [], "[object Array]" === Object.prototype.toString.call(t)) {
								for (var r = 0; r < n.length; r++) {
									var i = s(n[r]);
									a[i].references--
								}
								for (var o = d(t, e), l = 0; l < n.length; l++) {
									var c = s(n[l]);
									0 === a[c].references && (a[c].updater(), a.splice(c, 1))
								}
								n = o
							}
						}
					}
				},
				35: function(t, e, n) {
					var r, i = this && this.__extends || (r = function(t, e) {
						return (r = Object.setPrototypeOf || {
								__proto__: []
							}
							instanceof Array && function(t, e) {
								t.__proto__ = e
							} || function(t, e) {
								for (var n in e) Object.prototype.hasOwnProperty.call(e, n) && (t[n] = e[n])
							})(t, e)
					}, function(t, e) {
						function n() {
							this.constructor = t
						}
						r(t, e), t.prototype = null === e ? Object.create(e) : (n.prototype = e.prototype, new n)
					});
					Object.defineProperty(e, "__esModule", {
						value: !0
					});
					var o = n(593),
						a = function(t) {
							function e(e, n) {
								var r = t.call(this, e, n) || this;
								return r.container.classList.add(r.prefix + "-horizontal"), r.doms.background.style.width = "100%", r.update(), r
							}
							return i(e, t), e.prototype.update = function() {
								t.prototype.update.call(this);
								var e = this.doms.background.clientWidth,
									n = this.doms.background.clientHeight,
									r = this.doms.startSlider.clientWidth,
									i = this.doms.startSlider.clientHeight,
									o = this.doms.endSlider.clientWidth,
									a = this.doms.endSlider.clientHeight,
									s = (this.relative.upper - this.relative.lower) * e,
									d = this.doms.rangeSlider.clientHeight,
									l = this.relative.lower * e - r / 2,
									c = n / 2 - i / 2,
									u = this.relative.upper * e - o / 2,
									h = n / 2 - a / 2,
									p = this.relative.lower * e,
									v = n / 2 - d / 2;
								this.doms.startSlider.style.left = l + "px", this.doms.startSlider.style.top = c + "px", this.doms.endSlider.style.left = u + "px", this.doms.endSlider.style.top = h + "px", this.doms.rangeSlider.style.left = p + "px", this.doms.rangeSlider.style.top = v + "px", this.doms.rangeSlider.style.width = s + "px"
							}, e.prototype.getDx = function(t) {
								return t - this.doms.background.getBoundingClientRect().left
							}, e.prototype.draggingStart = function(t) {
								var e, n, r = t.clientX || (null === (n = null === (e = t.touches) || void 0 === e ? void 0 : e.item(0)) || void 0 === n ? void 0 : n.clientX) || 0,
									i = 1 - this.relative.minSpan,
									o = this.getDx(r) / this.doms.background.clientWidth;
								o < 0 && (o = 0), o > i && (o = i), this.relative.lower = o, o + this.relative.minSpan > this.relative.upper && (this.relative.upper = o + this.relative.minSpan), o + this.relative.maxSpan < this.relative.upper && (this.relative.upper = o + this.relative.maxSpan)
							}, e.prototype.draggingEnd = function(t) {
								var e, n, r = t.clientX || (null === (n = null === (e = t.touches) || void 0 === e ? void 0 : e.item(0)) || void 0 === n ? void 0 : n.clientX) || 0,
									i = this.relative.minSpan,
									o = this.getDx(r) / this.doms.background.clientWidth;
								o < i && (o = i), o > 1 && (o = 1), this.relative.upper = o, o - this.relative.minSpan < this.relative.lower && (this.relative.lower = o - this.relative.minSpan), o - this.relative.maxSpan > this.relative.lower && (this.relative.lower = o - this.relative.maxSpan)
							}, e.prototype.draggingRange = function(t) {
								var e, n, r = t.movementX || ((null === (n = null === (e = t.touches) || void 0 === e ? void 0 : e.item(0)) || void 0 === n ? void 0 : n.clientX) || 0) - this.prevClientX,
									i = 1 - this.relative.upper,
									o = -this.relative.lower,
									a = r / this.doms.background.clientWidth;
								a > i && (a = i), a < o && (a = o), this.relative.lower += a, this.relative.upper += a
							}, e.prototype.wheelScaling = function(t) {
								var e = o.getDeltaY(t) / this.doms.background.clientWidth,
									n = this.getDx(t.clientX) / this.doms.background.clientWidth,
									r = this.relative.upper - this.relative.lower,
									i = this.relative.lower - e * (n - this.relative.lower) / r,
									a = this.relative.upper + e * (this.relative.upper - n) / r;
								i < 0 && (i = 0), a > 1 && (a = 1), a - i < this.relative.minSpan && (i = n - this.relative.minSpan * (n - this.relative.lower) / r, a = n + this.relative.minSpan * (this.relative.upper - n) / r), a - i > this.relative.maxSpan && (i = n - this.relative.maxSpan * (n - this.relative.lower) / r, a = n + this.relative.maxSpan * (this.relative.upper - n) / r), this.relative.lower = i, this.relative.upper = a
							}, e.prototype.wheelScrolling = function(t) {
								var e = o.getDeltaY(t) / this.doms.background.clientWidth,
									n = -this.relative.lower,
									r = 1 - this.relative.upper;
								e < n && (e = n), e > r && (e = r), this.relative.lower += e, this.relative.upper += e
							}, e
						}(n(231).default);
					e.default = a
				},
				231: (t, e, n) => {
					Object.defineProperty(e, "__esModule", {
						value: !0
					}), n(654);
					var r = n(593),
						i = n(33),
						o = function() {
							function t(t, e) {
								var n, i = this;
								if (this.doms = {
										background: document.createElement("div"),
										startSlider: document.createElement("div"),
										endSlider: document.createElement("div"),
										rangeSlider: document.createElement("div")
									}, this.prefix = "drbar", this.underDragging = null, this.relative = {
										lower: 0,
										upper: 1,
										minSpan: .05,
										maxSpan: 1
									}, this.lowerBound = 0, this.upperBound = 1, this.prevClientX = 0, this.prevClientY = 0, this.container = "string" == typeof t ? document.getElementById(t) : t, !this.container) throw Error(t + " is not a <div> element.");
								null === this.container.id && (this.container.id = this.getUniqueID()), n = this.prefix + "-container", i.container.classList.contains(n) || i.container.classList.add(n), this.doms.background.classList.add(this.prefix + "-bg"), this.doms.startSlider.classList.add(this.prefix + "-slider", this.prefix + "-start"), this.doms.endSlider.classList.add(this.prefix + "-slider", this.prefix + "-end"), this.doms.rangeSlider.classList.add(this.prefix + "-range"), this.container.appendChild(this.doms.background), this.doms.background.appendChild(this.doms.rangeSlider), this.doms.background.appendChild(this.doms.startSlider), this.doms.background.appendChild(this.doms.endSlider), r.setStyle(this.container, {
									display: "flex",
									overflow: "visible",
									alignItems: "center",
									justifyContent: "center"
								});
								var o = {
									display: "block",
									overflow: "visible",
									position: "absolute"
								};
								r.setStyle(this.doms.background, o), r.setStyle(this.doms.startSlider, o), r.setStyle(this.doms.endSlider, o), r.setStyle(this.doms.rangeSlider, o), (null == e ? void 0 : e.minimizes) && this.container.classList.add(this.prefix + "-minimizes"), (null == e ? void 0 : e.size) && (this.container.classList.remove(this.prefix + "-small", this.prefix + "-large", this.prefix + "-huge"), "default" !== e.size && this.container.classList.add(this.prefix + "-" + e.size)), void 0 !== this.container.dataset.lowerBound && (this.lowerBound = parseFloat(this.container.dataset.lowerBound)), void 0 !== this.container.dataset.upperBound && (this.upperBound = parseFloat(this.container.dataset.upperBound)), void 0 !== this.container.dataset.minSpan && (this.minSpan = parseFloat(this.container.dataset.minSpan)), void 0 !== this.container.dataset.maxSpan && (this.maxSpan = parseFloat(this.container.dataset.maxSpan)), void 0 !== this.container.dataset.lower && (this.lower = parseFloat(this.container.dataset.lower)), void 0 !== this.container.dataset.upper && (this.upper = parseFloat(this.container.dataset.upper)), void 0 !== (null == e ? void 0 : e.lowerBound) && (this.lowerBound = e.lowerBound), void 0 !== (null == e ? void 0 : e.upperBound) && (this.upperBound = e.upperBound), void 0 !== (null == e ? void 0 : e.minSpan) && (this.minSpan = e.minSpan), void 0 !== (null == e ? void 0 : e.maxSpan) && (this.maxSpan = e.maxSpan), void 0 !== (null == e ? void 0 : e.lower) && (this.lower = e.lower), void 0 !== (null == e ? void 0 : e.upper) && (this.upper = e.upper);
								var a = {};
								if ((null == e ? void 0 : e.sliderColor) && (a["--slider-color"] = e.sliderColor), (null == e ? void 0 : e.sliderActiveColor) && (a["--slider-active"] = e.sliderActiveColor), (null == e ? void 0 : e.rangeColor) && (a["--range-color"] = e.rangeColor), (null == e ? void 0 : e.rangeActiveColor) && (a["--range-active"] = e.rangeActiveColor), (null == e ? void 0 : e.bgColor) && (a["--bg-color"] = e.bgColor), Object.keys(a).length > 0) {
									var s = "#" + this.container.id + "{";
									for (var d in a) s += d + ":" + a[d] + ";";
									s += "}";
									var l = document.createElement("style");
									l.innerText = s, document.head.appendChild(l)
								}
								this.handleEvents()
							}
							return t.prototype.emitEvent = function() {
								var t = new CustomEvent("update", {
									detail: this
								});
								this.container.dispatchEvent(t)
							}, t.prototype.getUniqueID = function() {
								return this.prefix + "-" + Math.random().toString(36).substr(2, 9)
							}, t.prototype.update = function() {
								this.container.dataset.lowerBound = this.lowerBound.toString(), this.container.dataset.upperBound = this.upperBound.toString(), this.container.dataset.minSpan = this.minSpan.toString(), this.container.dataset.maxSpan = this.maxSpan.toString(), this.container.dataset.lower = this.lower.toString(), this.container.dataset.upper = this.upper.toString()
							}, Object.defineProperty(t.prototype, "boundSpan", {
								get: function() {
									return this.upperBound - this.lowerBound
								},
								enumerable: !1,
								configurable: !0
							}), Object.defineProperty(t.prototype, "lower", {
								get: function() {
									return this.relative.lower * this.boundSpan + this.lowerBound
								},
								set: function(t) {
									if (0 === this.boundSpan) throw Error('"lowerBound" should not equal to "upperBound"');
									var e = (t - this.lowerBound) / this.boundSpan;
									if (e < 0 || e > 1) throw Error('"lower" value out of bound');
									this.relative.lower = e, this.update()
								},
								enumerable: !1,
								configurable: !0
							}), Object.defineProperty(t.prototype, "upper", {
								get: function() {
									return this.relative.upper * this.boundSpan + this.lowerBound
								},
								set: function(t) {
									if (0 === this.boundSpan) throw Error('"lowerBound" should not equal to "upperBound"');
									var e = (t - this.lowerBound) / this.boundSpan;
									if (e < 0 || e > 1) throw Error('"upper" value out of bound');
									this.relative.upper = e, this.update()
								},
								enumerable: !1,
								configurable: !0
							}), Object.defineProperty(t.prototype, "minSpan", {
								get: function() {
									return this.relative.minSpan * this.boundSpan
								},
								set: function(t) {
									if (0 === this.boundSpan) throw Error('"lowerBound" should not equal to "upperBound"');
									var e = Math.abs(t / this.boundSpan);
									if (e > 1) throw Error('Invalid "minSpan" specification');
									this.relative.minSpan = e, this.update()
								},
								enumerable: !1,
								configurable: !0
							}), Object.defineProperty(t.prototype, "maxSpan", {
								get: function() {
									return this.relative.maxSpan * this.boundSpan
								},
								set: function(t) {
									if (0 === this.boundSpan) throw Error('"lowerBound" should not equal to "upperBound"');
									var e = Math.abs(t / this.boundSpan);
									if (e > 1) throw Error('Invalid "maxSpan" specification');
									this.relative.maxSpan = e, this.update()
								},
								enumerable: !1,
								configurable: !0
							}), t.prototype.isTouchEvent = function(t) {
								return void 0 !== t.touches
							}, t.prototype.handleEvents = function() {
								var t = this;
								new i.default((function() {
									t.update()
								})).observe(this.container);
								var e = function(e) {
									var n, r;
									t.prevClientX = (null === (n = e.touches.item(0)) || void 0 === n ? void 0 : n.clientX) || 0, t.prevClientY = (null === (r = e.touches.item(0)) || void 0 === r ? void 0 : r.clientY) || 0
								};
								this.doms.startSlider.addEventListener("mousedown", (function() {
									t.underDragging = "start"
								}), {
									passive: true
								}), this.doms.startSlider.addEventListener("touchstart", (function(n) {
									e(n), t.underDragging = "start"
								}), {
									passive: true
								}), this.doms.endSlider.addEventListener("mousedown", (function() {
									t.underDragging = "end"
								})), this.doms.endSlider.addEventListener("touchstart", (function(n) {
									e(n), t.underDragging = "end"
								}), {
									passive: true
								}), this.doms.rangeSlider.addEventListener("mousedown", (function() {
									t.underDragging = "range"
								})), this.doms.rangeSlider.addEventListener("touchstart", (function(n) {
									e(n), t.underDragging = "range"
								}), {
									passive: true
								});
								var n = function(n) {
									switch (null !== t.underDragging && n.preventDefault(), t.underDragging) {
										case null:
											return;
										case "start":
											t.draggingStart(n);
											break;
										case "end":
											t.draggingEnd(n);
											break;
										case "range":
											t.draggingRange(n)
									}
									t.isTouchEvent(n) && e(n), t.update(), t.emitEvent()
								};
								window.addEventListener("mousemove", n), window.addEventListener("touchmove", n);
								var r = function() {
									null !== t.underDragging && (t.underDragging = null, t.update(), t.emitEvent())
								};
								window.addEventListener("mouseup", r), window.addEventListener("touchend", r), window.addEventListener("touchcancel", r), this.doms.rangeSlider.addEventListener("wheel", (function(e) {
									e.preventDefault(), e.stopPropagation(), t.wheelScaling(e), t.update(), t.emitEvent()
								}), {
									passive: true
								}), this.doms.background.addEventListener("wheel", (function(e) {
									e.preventDefault(), e.stopPropagation(), t.wheelScrolling(e), t.update(), t.emitEvent()
								}), {
									passive: true
								})
							}, t.prototype.addEventListener = function(t, e, n) {
								this.container.addEventListener(t, e, n)
							}, t.prototype.dispatchEvent = function(t) {
								return this.container.dispatchEvent(t)
							}, t.prototype.removeEventListener = function(t, e, n) {
								this.container.removeEventListener(t, e, n)
							}, t
						}();
					e.default = o
				},
				646: function(t, e, n) {
					var r, i = this && this.__extends || (r = function(t, e) {
						return (r = Object.setPrototypeOf || {
								__proto__: []
							}
							instanceof Array && function(t, e) {
								t.__proto__ = e
							} || function(t, e) {
								for (var n in e) Object.prototype.hasOwnProperty.call(e, n) && (t[n] = e[n])
							})(t, e)
					}, function(t, e) {
						function n() {
							this.constructor = t
						}
						r(t, e), t.prototype = null === e ? Object.create(e) : (n.prototype = e.prototype, new n)
					});
					Object.defineProperty(e, "__esModule", {
						value: !0
					});
					var o = n(593),
						a = function(t) {
							function e(e, n) {
								var r = t.call(this, e, n) || this;
								return r.container.classList.add(r.prefix + "-vertical"), r.doms.background.style.height = "100%", r.update(), r
							}
							return i(e, t), e.prototype.update = function() {
								t.prototype.update.call(this);
								var e = this.doms.background.clientWidth,
									n = this.doms.background.clientHeight,
									r = this.doms.startSlider.clientWidth,
									i = this.doms.startSlider.clientHeight,
									o = this.doms.endSlider.clientWidth,
									a = this.doms.endSlider.clientHeight,
									s = this.doms.rangeSlider.clientWidth,
									d = (this.relative.upper - this.relative.lower) * n,
									l = e / 2 - r / 2,
									c = this.relative.lower * n - i / 2,
									u = e / 2 - o / 2,
									h = this.relative.upper * n - a / 2,
									p = e / 2 - s / 2,
									v = this.relative.lower * n;
								this.doms.startSlider.style.left = l + "px", this.doms.startSlider.style.top = c + "px", this.doms.endSlider.style.left = u + "px", this.doms.endSlider.style.top = h + "px", this.doms.rangeSlider.style.left = p + "px", this.doms.rangeSlider.style.top = v + "px", this.doms.rangeSlider.style.height = d + "px"
							}, e.prototype.getDy = function(t) {
								return t - this.doms.background.getBoundingClientRect().top
							}, e.prototype.draggingStart = function(t) {
								var e, n, r = t.clientY || (null === (n = null === (e = t.touches) || void 0 === e ? void 0 : e.item(0)) || void 0 === n ? void 0 : n.clientY) || 0,
									i = 1 - this.relative.minSpan,
									o = this.getDy(r) / this.doms.background.clientHeight;
								o < 0 && (o = 0), o > i && (o = i), this.relative.lower = o, o + this.relative.minSpan > this.relative.upper && (this.relative.upper = o + this.relative.minSpan), o + this.relative.maxSpan < this.relative.upper && (this.relative.upper = o + this.relative.maxSpan)
							}, e.prototype.draggingEnd = function(t) {
								var e, n, r = t.clientY || (null === (n = null === (e = t.touches) || void 0 === e ? void 0 : e.item(0)) || void 0 === n ? void 0 : n.clientY) || 0,
									i = this.relative.minSpan,
									o = this.getDy(r) / this.doms.background.clientHeight;
								o < i && (o = i), o > 1 && (o = 1), this.relative.upper = o, o - this.relative.minSpan < this.relative.lower && (this.relative.lower = o - this.relative.minSpan), o - this.relative.maxSpan > this.relative.lower && (this.relative.lower = o - this.relative.maxSpan)
							}, e.prototype.draggingRange = function(t) {
								var e, n, r = t.movementY || ((null === (n = null === (e = t.touches) || void 0 === e ? void 0 : e.item(0)) || void 0 === n ? void 0 : n.clientY) || 0) - this.prevClientY,
									i = 1 - this.relative.upper,
									o = -this.relative.lower,
									a = r / this.doms.background.clientHeight;
								a > i && (a = i), a < o && (a = o), this.relative.lower += a, this.relative.upper += a
							}, e.prototype.wheelScaling = function(t) {
								var e = o.getDeltaY(t) / this.doms.background.clientHeight,
									n = this.getDy(t.clientY) / this.doms.background.clientHeight,
									r = this.relative.upper - this.relative.lower,
									i = this.relative.lower - e * (n - this.relative.lower) / r,
									a = this.relative.upper + e * (this.relative.upper - n) / r;
								i < 0 && (i = 0), a > 1 && (a = 1), a - i < this.relative.minSpan && (i = n - this.relative.minSpan * (n - this.relative.lower) / r, a = n + this.relative.minSpan * (this.relative.upper - n) / r), a - i > this.relative.maxSpan && (i = n - this.relative.maxSpan * (n - this.relative.lower) / r, a = n + this.relative.maxSpan * (this.relative.upper - n) / r), this.relative.lower = i, this.relative.upper = a
							}, e.prototype.wheelScrolling = function(t) {
								var e = o.getDeltaY(t) / this.doms.background.clientHeight,
									n = -this.relative.lower,
									r = 1 - this.relative.upper;
								e < n && (e = n), e > r && (e = r), this.relative.lower += e, this.relative.upper += e
							}, e
						}(n(231).default);
					e.default = a
				},
				607: (t, e, n) => {
					Object.defineProperty(e, "__esModule", {
						value: !0
					}), e.DualVRangeBar = e.DualHRangeBar = void 0;
					var r = n(35);
					e.DualHRangeBar = r.default;
					var i = n(646);
					e.DualVRangeBar = i.default, window.addEventListener("load", (function() {
						for (var t = document.getElementsByClassName("drbar-container"), e = 0; e < t.length; e++) {
							var n = t.item(e);
							"DIV" === (null == n ? void 0 : n.nodeName) && ((null == n ? void 0 : n.childElementCount) > 0 || ((null == n ? void 0 : n.classList.contains("drbar-vertical")) ? new i.default(n) : new r.default(n)))
						}
					})), window.DualHRange = r.default, window.DualVRange = i.default
				},
				593: (t, e) => {
					Object.defineProperty(e, "__esModule", {
						value: !0
					}), e.getDeltaY = e.setStyle = void 0, e.setStyle = function(t, e) {
						Object.assign(t.style, e)
					}, e.getDeltaY = function(t) {
						var e = 1 === t.deltaMode ? 16 : 1;
						return t.deltaY * e
					}
				}
			},
			e = {};

		function n(r) {
			if (e[r]) return e[r].exports;
			var i = e[r] = {
				id: r,
				exports: {}
			};
			return t[r].call(i.exports, i, i.exports, n), i.exports
		}
		return n.n = t => {
			var e = t && t.__esModule ? () => t.default : () => t;
			return n.d(e, {
				a: e
			}), e
		}, n.d = (t, e) => {
			for (var r in e) n.o(e, r) && !n.o(t, r) && Object.defineProperty(t, r, {
				enumerable: !0,
				get: e[r]
			})
		}, n.g = function() {
			if ("object" == typeof globalThis) return globalThis;
			try {
				return this || new Function("return this")()
			} catch (t) {
				if ("object" == typeof window) return window
			}
		}(), n.o = (t, e) => Object.prototype.hasOwnProperty.call(t, e), n.r = t => {
			"undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
				value: "Module"
			}), Object.defineProperty(t, "__esModule", {
				value: !0
			})
		}, n(607)
	})()
}));
