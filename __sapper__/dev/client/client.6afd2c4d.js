function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function claim_element(nodes, name, attributes, svg) {
    for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (node.nodeName === name) {
            let j = 0;
            while (j < node.attributes.length) {
                const attribute = node.attributes[j];
                if (attributes[attribute.name]) {
                    j++;
                }
                else {
                    node.removeAttribute(attribute.name);
                }
            }
            return nodes.splice(i, 1)[0];
        }
    }
    return svg ? svg_element(name) : element(name);
}
function claim_text(nodes, data) {
    for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (node.nodeType === 3) {
            node.data = '' + data;
            return nodes.splice(i, 1)[0];
        }
    }
    return text(data);
}
function claim_space(nodes) {
    return claim_text(nodes, ' ');
}
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}
function query_selector_all(selector, parent = document.body) {
    return Array.from(parent.querySelectorAll(selector));
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function afterUpdate(fn) {
    get_current_component().$$.after_update.push(fn);
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}
function create_component(block) {
    block && block.c();
}
function claim_component(block, parent_nodes) {
    block && block.l(parent_nodes);
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
}
function append_dev(target, node) {
    dispatch_dev("SvelteDOMInsert", { target, node });
    append(target, node);
}
function insert_dev(target, node, anchor) {
    dispatch_dev("SvelteDOMInsert", { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev("SvelteDOMRemove", { node });
    detach(node);
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
    else
        dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
}
function set_data_dev(text, data) {
    data = '' + data;
    if (text.data === data)
        return;
    dispatch_dev("SvelteDOMSetData", { node: text, data });
    text.data = data;
}
function validate_each_argument(arg) {
    if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
        let msg = '{#each} only iterates over array-like objects.';
        if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
            msg += ' You can use a spread to convert this iterable into an array.';
        }
        throw new Error(msg);
    }
}
function validate_slots(name, slot, keys) {
    for (const slot_key of Object.keys(slot)) {
        if (!~keys.indexOf(slot_key)) {
            console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
        }
    }
}
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error(`'target' is a required option`);
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn(`Component was already destroyed`); // eslint-disable-line no-console
        };
    }
    $capture_state() { }
    $inject_state() { }
}

const subscriber_queue = [];
/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
function readable(value, start) {
    return {
        subscribe: writable(value, start).subscribe,
    };
}
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}
function derived(stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single
        ? [stores]
        : stores;
    const auto = fn.length < 2;
    return readable(initial_value, (set) => {
        let inited = false;
        const values = [];
        let pending = 0;
        let cleanup = noop;
        const sync = () => {
            if (pending) {
                return;
            }
            cleanup();
            const result = fn(single ? values[0] : values, set);
            if (auto) {
                set(result);
            }
            else {
                cleanup = is_function(result) ? result : noop;
            }
        };
        const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
            values[i] = value;
            pending &= ~(1 << i);
            if (inited) {
                sync();
            }
        }, () => {
            pending |= (1 << i);
        }));
        inited = true;
        sync();
        return function stop() {
            run_all(unsubscribers);
            cleanup();
        };
    });
}

const CONTEXT_KEY = {};

const preload = () => ({});

/* src/styles/tailwind.svelte generated by Svelte v3.22.2 */

function create_fragment(ctx) {
	const block = {
		c: noop,
		l: noop,
		m: noop,
		p: noop,
		i: noop,
		o: noop,
		d: noop
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props) {
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Tailwind> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Tailwind", $$slots, []);
	return [];
}

class Tailwind extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Tailwind",
			options,
			id: create_fragment.name
		});
	}
}

/* src/routes/_layout.svelte generated by Svelte v3.22.2 */

function create_fragment$1(ctx) {
	let current;
	const default_slot_template = /*$$slots*/ ctx[1].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

	const block = {
		c: function create() {
			if (default_slot) default_slot.c();
		},
		l: function claim(nodes) {
			if (default_slot) default_slot.l(nodes);
		},
		m: function mount(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 1) {
					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[0], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null));
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$1($$self, $$props, $$invalidate) {
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Layout> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Layout", $$slots, ['default']);

	$$self.$set = $$props => {
		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({ Tailwind });
	return [$$scope, $$slots];
}

class Layout extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Layout",
			options,
			id: create_fragment$1.name
		});
	}
}

/* src/node_modules/@sapper/internal/error.svelte generated by Svelte v3.22.2 */

const { Error: Error_1 } = globals;
const file = "src/node_modules/@sapper/internal/error.svelte";

// (10:0) {#if "development" === 'development'}
function create_if_block(ctx) {
	let pre;
	let t_value = /*error*/ ctx[0].stack + "";
	let t;

	const block = {
		c: function create() {
			pre = element("pre");
			t = text(t_value);
			this.h();
		},
		l: function claim(nodes) {
			pre = claim_element(nodes, "PRE", {});
			var pre_nodes = children(pre);
			t = claim_text(pre_nodes, t_value);
			pre_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			add_location(pre, file, 10, 1, 141);
		},
		m: function mount(target, anchor) {
			insert_dev(target, pre, anchor);
			append_dev(pre, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*error*/ 1 && t_value !== (t_value = /*error*/ ctx[0].stack + "")) set_data_dev(t, t_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(pre);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(10:0) {#if \\\"development\\\" === 'development'}",
		ctx
	});

	return block;
}

function create_fragment$2(ctx) {
	let h1;
	let t0;
	let t1;
	let p;
	let t2_value = /*error*/ ctx[0].message + "";
	let t2;
	let t3;
	let if_block_anchor;
	let if_block =  create_if_block(ctx);

	const block = {
		c: function create() {
			h1 = element("h1");
			t0 = text(/*status*/ ctx[1]);
			t1 = space();
			p = element("p");
			t2 = text(t2_value);
			t3 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			this.h();
		},
		l: function claim(nodes) {
			h1 = claim_element(nodes, "H1", {});
			var h1_nodes = children(h1);
			t0 = claim_text(h1_nodes, /*status*/ ctx[1]);
			h1_nodes.forEach(detach_dev);
			t1 = claim_space(nodes);
			p = claim_element(nodes, "P", {});
			var p_nodes = children(p);
			t2 = claim_text(p_nodes, t2_value);
			p_nodes.forEach(detach_dev);
			t3 = claim_space(nodes);
			if (if_block) if_block.l(nodes);
			if_block_anchor = empty();
			this.h();
		},
		h: function hydrate() {
			add_location(h1, file, 5, 0, 59);
			add_location(p, file, 7, 0, 78);
		},
		m: function mount(target, anchor) {
			insert_dev(target, h1, anchor);
			append_dev(h1, t0);
			insert_dev(target, t1, anchor);
			insert_dev(target, p, anchor);
			append_dev(p, t2);
			insert_dev(target, t3, anchor);
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*status*/ 2) set_data_dev(t0, /*status*/ ctx[1]);
			if (dirty & /*error*/ 1 && t2_value !== (t2_value = /*error*/ ctx[0].message + "")) set_data_dev(t2, t2_value);
			if_block.p(ctx, dirty);
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(h1);
			if (detaching) detach_dev(t1);
			if (detaching) detach_dev(p);
			if (detaching) detach_dev(t3);
			if (if_block) if_block.d(detaching);
			if (detaching) detach_dev(if_block_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$2.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$2($$self, $$props, $$invalidate) {
	let { error } = $$props;
	let { status } = $$props;
	const writable_props = ["error", "status"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Error> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Error", $$slots, []);

	$$self.$set = $$props => {
		if ("error" in $$props) $$invalidate(0, error = $$props.error);
		if ("status" in $$props) $$invalidate(1, status = $$props.status);
	};

	$$self.$capture_state = () => ({ error, status });

	$$self.$inject_state = $$props => {
		if ("error" in $$props) $$invalidate(0, error = $$props.error);
		if ("status" in $$props) $$invalidate(1, status = $$props.status);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [error, status];
}

class Error$1 extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { error: 0, status: 1 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Error",
			options,
			id: create_fragment$2.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*error*/ ctx[0] === undefined && !("error" in props)) {
			console.warn("<Error> was created without expected prop 'error'");
		}

		if (/*status*/ ctx[1] === undefined && !("status" in props)) {
			console.warn("<Error> was created without expected prop 'status'");
		}
	}

	get error() {
		throw new Error_1("<Error>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set error(value) {
		throw new Error_1("<Error>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get status() {
		throw new Error_1("<Error>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set status(value) {
		throw new Error_1("<Error>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src/node_modules/@sapper/internal/App.svelte generated by Svelte v3.22.2 */

const { Error: Error_1$1 } = globals;

// (23:1) {:else}
function create_else_block(ctx) {
	let switch_instance_anchor;
	let current;
	const switch_instance_spread_levels = [/*level1*/ ctx[4].props];
	var switch_value = /*level1*/ ctx[4].component;

	function switch_props(ctx) {
		let switch_instance_props = {};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return {
			props: switch_instance_props,
			$$inline: true
		};
	}

	if (switch_value) {
		var switch_instance = new switch_value(switch_props());
	}

	const block = {
		c: function create() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		l: function claim(nodes) {
			if (switch_instance) claim_component(switch_instance.$$.fragment, nodes);
			switch_instance_anchor = empty();
		},
		m: function mount(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert_dev(target, switch_instance_anchor, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const switch_instance_changes = (dirty & /*level1*/ 16)
			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*level1*/ ctx[4].props)])
			: {};

			if (switch_value !== (switch_value = /*level1*/ ctx[4].component)) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i: function intro(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block.name,
		type: "else",
		source: "(23:1) {:else}",
		ctx
	});

	return block;
}

// (21:1) {#if error}
function create_if_block$1(ctx) {
	let current;

	const error_1 = new Error$1({
			props: {
				error: /*error*/ ctx[0],
				status: /*status*/ ctx[1]
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(error_1.$$.fragment);
		},
		l: function claim(nodes) {
			claim_component(error_1.$$.fragment, nodes);
		},
		m: function mount(target, anchor) {
			mount_component(error_1, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const error_1_changes = {};
			if (dirty & /*error*/ 1) error_1_changes.error = /*error*/ ctx[0];
			if (dirty & /*status*/ 2) error_1_changes.status = /*status*/ ctx[1];
			error_1.$set(error_1_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(error_1.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(error_1.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(error_1, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$1.name,
		type: "if",
		source: "(21:1) {#if error}",
		ctx
	});

	return block;
}

// (20:0) <Layout segment="{segments[0]}" {...level0.props}>
function create_default_slot(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block$1, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*error*/ ctx[0]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	const block = {
		c: function create() {
			if_block.c();
			if_block_anchor = empty();
		},
		l: function claim(nodes) {
			if_block.l(nodes);
			if_block_anchor = empty();
		},
		m: function mount(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o: function outro(local) {
			transition_out(if_block);
			current = false;
		},
		d: function destroy(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach_dev(if_block_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot.name,
		type: "slot",
		source: "(20:0) <Layout segment=\\\"{segments[0]}\\\" {...level0.props}>",
		ctx
	});

	return block;
}

function create_fragment$3(ctx) {
	let current;
	const layout_spread_levels = [{ segment: /*segments*/ ctx[2][0] }, /*level0*/ ctx[3].props];

	let layout_props = {
		$$slots: { default: [create_default_slot] },
		$$scope: { ctx }
	};

	for (let i = 0; i < layout_spread_levels.length; i += 1) {
		layout_props = assign(layout_props, layout_spread_levels[i]);
	}

	const layout = new Layout({ props: layout_props, $$inline: true });

	const block = {
		c: function create() {
			create_component(layout.$$.fragment);
		},
		l: function claim(nodes) {
			claim_component(layout.$$.fragment, nodes);
		},
		m: function mount(target, anchor) {
			mount_component(layout, target, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			const layout_changes = (dirty & /*segments, level0*/ 12)
			? get_spread_update(layout_spread_levels, [
					dirty & /*segments*/ 4 && { segment: /*segments*/ ctx[2][0] },
					dirty & /*level0*/ 8 && get_spread_object(/*level0*/ ctx[3].props)
				])
			: {};

			if (dirty & /*$$scope, error, status, level1*/ 147) {
				layout_changes.$$scope = { dirty, ctx };
			}

			layout.$set(layout_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(layout.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(layout.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(layout, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$3.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$3($$self, $$props, $$invalidate) {
	let { stores } = $$props;
	let { error } = $$props;
	let { status } = $$props;
	let { segments } = $$props;
	let { level0 } = $$props;
	let { level1 = null } = $$props;
	let { notify } = $$props;
	afterUpdate(notify);
	setContext(CONTEXT_KEY, stores);
	const writable_props = ["stores", "error", "status", "segments", "level0", "level1", "notify"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("App", $$slots, []);

	$$self.$set = $$props => {
		if ("stores" in $$props) $$invalidate(5, stores = $$props.stores);
		if ("error" in $$props) $$invalidate(0, error = $$props.error);
		if ("status" in $$props) $$invalidate(1, status = $$props.status);
		if ("segments" in $$props) $$invalidate(2, segments = $$props.segments);
		if ("level0" in $$props) $$invalidate(3, level0 = $$props.level0);
		if ("level1" in $$props) $$invalidate(4, level1 = $$props.level1);
		if ("notify" in $$props) $$invalidate(6, notify = $$props.notify);
	};

	$$self.$capture_state = () => ({
		setContext,
		afterUpdate,
		CONTEXT_KEY,
		Layout,
		Error: Error$1,
		stores,
		error,
		status,
		segments,
		level0,
		level1,
		notify
	});

	$$self.$inject_state = $$props => {
		if ("stores" in $$props) $$invalidate(5, stores = $$props.stores);
		if ("error" in $$props) $$invalidate(0, error = $$props.error);
		if ("status" in $$props) $$invalidate(1, status = $$props.status);
		if ("segments" in $$props) $$invalidate(2, segments = $$props.segments);
		if ("level0" in $$props) $$invalidate(3, level0 = $$props.level0);
		if ("level1" in $$props) $$invalidate(4, level1 = $$props.level1);
		if ("notify" in $$props) $$invalidate(6, notify = $$props.notify);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [error, status, segments, level0, level1, stores, notify];
}

class App extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
			stores: 5,
			error: 0,
			status: 1,
			segments: 2,
			level0: 3,
			level1: 4,
			notify: 6
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "App",
			options,
			id: create_fragment$3.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*stores*/ ctx[5] === undefined && !("stores" in props)) {
			console.warn("<App> was created without expected prop 'stores'");
		}

		if (/*error*/ ctx[0] === undefined && !("error" in props)) {
			console.warn("<App> was created without expected prop 'error'");
		}

		if (/*status*/ ctx[1] === undefined && !("status" in props)) {
			console.warn("<App> was created without expected prop 'status'");
		}

		if (/*segments*/ ctx[2] === undefined && !("segments" in props)) {
			console.warn("<App> was created without expected prop 'segments'");
		}

		if (/*level0*/ ctx[3] === undefined && !("level0" in props)) {
			console.warn("<App> was created without expected prop 'level0'");
		}

		if (/*notify*/ ctx[6] === undefined && !("notify" in props)) {
			console.warn("<App> was created without expected prop 'notify'");
		}
	}

	get stores() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set stores(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get error() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set error(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get status() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set status(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get segments() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set segments(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get level0() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set level0(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get level1() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set level1(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get notify() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set notify(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

// This file is generated by Sapper — do not edit it!

const ignore = [];

const components = [
	{
		js: () => import('./index.7ffe8f72.js'),
		css: ["client.6afd2c4d.css"]
	}
];

const routes = [
	{
		// index.svelte
		pattern: /^\/$/,
		parts: [
			{ i: 0 }
		]
	}
];

if (typeof window !== 'undefined') {
	import('./sapper-dev-client.89e34bae.js').then(client => {
		client.connect(10000);
	});
}

function goto(href, opts = { replaceState: false }) {
	const target = select_target(new URL(href, document.baseURI));

	if (target) {
		_history[opts.replaceState ? 'replaceState' : 'pushState']({ id: cid }, '', href);
		return navigate(target, null).then(() => {});
	}

	location.href = href;
	return new Promise(f => {}); // never resolves
}

/** Callback to inform of a value updates. */



















function page_store(value) {
	const store = writable(value);
	let ready = true;

	function notify() {
		ready = true;
		store.update(val => val);
	}

	function set(new_value) {
		ready = false;
		store.set(new_value);
	}

	function subscribe(run) {
		let old_value;
		return store.subscribe((value) => {
			if (old_value === undefined || (ready && value !== old_value)) {
				run(old_value = value);
			}
		});
	}

	return { notify, set, subscribe };
}

const initial_data = typeof __SAPPER__ !== 'undefined' && __SAPPER__;

let ready = false;
let root_component;
let current_token;
let root_preloaded;
let current_branch = [];
let current_query = '{}';

const stores = {
	page: page_store({}),
	preloading: writable(null),
	session: writable(initial_data && initial_data.session)
};

let $session;
let session_dirty;

stores.session.subscribe(async value => {
	$session = value;

	if (!ready) return;
	session_dirty = true;

	const target = select_target(new URL(location.href));

	const token = current_token = {};
	const { redirect, props, branch } = await hydrate_target(target);
	if (token !== current_token) return; // a secondary navigation happened while we were loading

	await render(redirect, branch, props, target.page);
});

let prefetching


 = null;
function set_prefetching(href, promise) {
	prefetching = { href, promise };
}

let target;
function set_target(element) {
	target = element;
}

let uid = 1;
function set_uid(n) {
	uid = n;
}

let cid;
function set_cid(n) {
	cid = n;
}

const _history = typeof history !== 'undefined' ? history : {
	pushState: (state, title, href) => {},
	replaceState: (state, title, href) => {},
	scrollRestoration: ''
};

const scroll_history = {};

function extract_query(search) {
	const query = Object.create(null);
	if (search.length > 0) {
		search.slice(1).split('&').forEach(searchParam => {
			let [, key, value = ''] = /([^=]*)(?:=(.*))?/.exec(decodeURIComponent(searchParam.replace(/\+/g, ' ')));
			if (typeof query[key] === 'string') query[key] = [query[key]];
			if (typeof query[key] === 'object') (query[key] ).push(value);
			else query[key] = value;
		});
	}
	return query;
}

function select_target(url) {
	if (url.origin !== location.origin) return null;
	if (!url.pathname.startsWith(initial_data.baseUrl)) return null;

	let path = url.pathname.slice(initial_data.baseUrl.length);

	if (path === '') {
		path = '/';
	}

	// avoid accidental clashes between server routes and page routes
	if (ignore.some(pattern => pattern.test(path))) return;

	for (let i = 0; i < routes.length; i += 1) {
		const route = routes[i];

		const match = route.pattern.exec(path);

		if (match) {
			const query = extract_query(url.search);
			const part = route.parts[route.parts.length - 1];
			const params = part.params ? part.params(match) : {};

			const page = { host: location.host, path, query, params };

			return { href: url.href, route, match, page };
		}
	}
}

function handle_error(url) {
	const { host, pathname, search } = location;
	const { session, preloaded, status, error } = initial_data;

	if (!root_preloaded) {
		root_preloaded = preloaded && preloaded[0];
	}

	const props = {
		error,
		status,
		session,
		level0: {
			props: root_preloaded
		},
		level1: {
			props: {
				status,
				error
			},
			component: Error$1
		},
		segments: preloaded

	};
	const query = extract_query(search);
	render(null, [], props, { host, path: pathname, query, params: {} });
}

function scroll_state() {
	return {
		x: pageXOffset,
		y: pageYOffset
	};
}

async function navigate(target, id, noscroll, hash) {
	if (id) {
		// popstate or initial navigation
		cid = id;
	} else {
		const current_scroll = scroll_state();

		// clicked on a link. preserve scroll state
		scroll_history[cid] = current_scroll;

		id = cid = ++uid;
		scroll_history[cid] = noscroll ? current_scroll : { x: 0, y: 0 };
	}

	cid = id;

	if (root_component) stores.preloading.set(true);

	const loaded = prefetching && prefetching.href === target.href ?
		prefetching.promise :
		hydrate_target(target);

	prefetching = null;

	const token = current_token = {};
	const { redirect, props, branch } = await loaded;
	if (token !== current_token) return; // a secondary navigation happened while we were loading

	await render(redirect, branch, props, target.page);
	if (document.activeElement) document.activeElement.blur();

	if (!noscroll) {
		let scroll = scroll_history[id];

		if (hash) {
			// scroll is an element id (from a hash), we need to compute y.
			const deep_linked = document.getElementById(hash.slice(1));

			if (deep_linked) {
				scroll = {
					x: 0,
					y: deep_linked.getBoundingClientRect().top + scrollY
				};
			}
		}

		scroll_history[cid] = scroll;
		if (scroll) scrollTo(scroll.x, scroll.y);
	}
}

async function render(redirect, branch, props, page) {
	if (redirect) return goto(redirect.location, { replaceState: true });

	stores.page.set(page);
	stores.preloading.set(false);

	if (root_component) {
		root_component.$set(props);
	} else {
		props.stores = {
			page: { subscribe: stores.page.subscribe },
			preloading: { subscribe: stores.preloading.subscribe },
			session: stores.session
		};
		props.level0 = {
			props: await root_preloaded
		};
		props.notify = stores.page.notify;

		// first load — remove SSR'd <head> contents
		const start = document.querySelector('#sapper-head-start');
		const end = document.querySelector('#sapper-head-end');

		if (start && end) {
			while (start.nextSibling !== end) detach$1(start.nextSibling);
			detach$1(start);
			detach$1(end);
		}

		root_component = new App({
			target,
			props,
			hydrate: true
		});
	}

	current_branch = branch;
	current_query = JSON.stringify(page.query);
	ready = true;
	session_dirty = false;
}

function part_changed(i, segment, match, stringified_query) {
	// TODO only check query string changes for preload functions
	// that do in fact depend on it (using static analysis or
	// runtime instrumentation)
	if (stringified_query !== current_query) return true;

	const previous = current_branch[i];

	if (!previous) return false;
	if (segment !== previous.segment) return true;
	if (previous.match) {
		if (JSON.stringify(previous.match.slice(1, i + 2)) !== JSON.stringify(match.slice(1, i + 2))) {
			return true;
		}
	}
}

async function hydrate_target(target)



 {
	const { route, page } = target;
	const segments = page.path.split('/').filter(Boolean);

	let redirect = null;

	const props = { error: null, status: 200, segments: [segments[0]] };

	const preload_context = {
		fetch: (url, opts) => fetch(url, opts),
		redirect: (statusCode, location) => {
			if (redirect && (redirect.statusCode !== statusCode || redirect.location !== location)) {
				throw new Error(`Conflicting redirects`);
			}
			redirect = { statusCode, location };
		},
		error: (status, error) => {
			props.error = typeof error === 'string' ? new Error(error) : error;
			props.status = status;
		}
	};

	if (!root_preloaded) {
		root_preloaded = initial_data.preloaded[0] || preload.call(preload_context, {
			host: page.host,
			path: page.path,
			query: page.query,
			params: {}
		}, $session);
	}

	let branch;
	let l = 1;

	try {
		const stringified_query = JSON.stringify(page.query);
		const match = route.pattern.exec(page.path);

		let segment_dirty = false;

		branch = await Promise.all(route.parts.map(async (part, i) => {
			const segment = segments[i];

			if (part_changed(i, segment, match, stringified_query)) segment_dirty = true;

			props.segments[l] = segments[i + 1]; // TODO make this less confusing
			if (!part) return { segment };

			const j = l++;

			if (!session_dirty && !segment_dirty && current_branch[i] && current_branch[i].part === part.i) {
				return current_branch[i];
			}

			segment_dirty = false;

			const { default: component, preload } = await load_component(components[part.i]);

			let preloaded;
			if (ready || !initial_data.preloaded[i + 1]) {
				preloaded = preload
					? await preload.call(preload_context, {
						host: page.host,
						path: page.path,
						query: page.query,
						params: part.params ? part.params(target.match) : {}
					}, $session)
					: {};
			} else {
				preloaded = initial_data.preloaded[i + 1];
			}

			return (props[`level${j}`] = { component, props: preloaded, segment, match, part: part.i });
		}));
	} catch (error) {
		props.error = error;
		props.status = 500;
		branch = [];
	}

	return { redirect, props, branch };
}

function load_css(chunk) {
	const href = `client/${chunk}`;
	if (document.querySelector(`link[href="${href}"]`)) return;

	return new Promise((fulfil, reject) => {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = href;

		link.onload = () => fulfil();
		link.onerror = reject;

		document.head.appendChild(link);
	});
}

function load_component(component)


 {
	// TODO this is temporary — once placeholders are
	// always rewritten, scratch the ternary
	const promises = (typeof component.css === 'string' ? [] : component.css.map(load_css));
	promises.unshift(component.js());
	return Promise.all(promises).then(values => values[0]);
}

function detach$1(node) {
	node.parentNode.removeChild(node);
}

function prefetch(href) {
	const target = select_target(new URL(href, document.baseURI));

	if (target) {
		if (!prefetching || href !== prefetching.href) {
			set_prefetching(href, hydrate_target(target));
		}

		return prefetching.promise;
	}
}

function start(opts

) {
	if ('scrollRestoration' in _history) {
		_history.scrollRestoration = 'manual';
	}
	
	// Adopted from Nuxt.js
	// Reset scrollRestoration to auto when leaving page, allowing page reload
	// and back-navigation from other pages to use the browser to restore the
	// scrolling position.
	addEventListener('beforeunload', () => {
		_history.scrollRestoration = 'auto';
	});

	// Setting scrollRestoration to manual again when returning to this page.
	addEventListener('load', () => {
		_history.scrollRestoration = 'manual';
	});

	set_target(opts.target);

	addEventListener('click', handle_click);
	addEventListener('popstate', handle_popstate);

	// prefetch
	addEventListener('touchstart', trigger_prefetch);
	addEventListener('mousemove', handle_mousemove);

	return Promise.resolve().then(() => {
		const { hash, href } = location;

		_history.replaceState({ id: uid }, '', href);

		const url = new URL(location.href);

		if (initial_data.error) return handle_error();

		const target = select_target(url);
		if (target) return navigate(target, uid, true, hash);
	});
}

let mousemove_timeout;

function handle_mousemove(event) {
	clearTimeout(mousemove_timeout);
	mousemove_timeout = setTimeout(() => {
		trigger_prefetch(event);
	}, 20);
}

function trigger_prefetch(event) {
	const a = find_anchor(event.target);
	if (!a || a.rel !== 'prefetch') return;

	prefetch(a.href);
}

function handle_click(event) {
	// Adapted from https://github.com/visionmedia/page.js
	// MIT license https://github.com/visionmedia/page.js#license
	if (which(event) !== 1) return;
	if (event.metaKey || event.ctrlKey || event.shiftKey) return;
	if (event.defaultPrevented) return;

	const a = find_anchor(event.target);
	if (!a) return;

	if (!a.href) return;

	// check if link is inside an svg
	// in this case, both href and target are always inside an object
	const svg = typeof a.href === 'object' && a.href.constructor.name === 'SVGAnimatedString';
	const href = String(svg ? (a).href.baseVal : a.href);

	if (href === location.href) {
		if (!location.hash) event.preventDefault();
		return;
	}

	// Ignore if tag has
	// 1. 'download' attribute
	// 2. rel='external' attribute
	if (a.hasAttribute('download') || a.getAttribute('rel') === 'external') return;

	// Ignore if <a> has a target
	if (svg ? (a).target.baseVal : a.target) return;

	const url = new URL(href);

	// Don't handle hash changes
	if (url.pathname === location.pathname && url.search === location.search) return;

	const target = select_target(url);
	if (target) {
		const noscroll = a.hasAttribute('sapper-noscroll');
		navigate(target, null, noscroll, url.hash);
		event.preventDefault();
		_history.pushState({ id: cid }, '', url.href);
	}
}

function which(event) {
	return event.which === null ? event.button : event.which;
}

function find_anchor(node) {
	while (node && node.nodeName.toUpperCase() !== 'A') node = node.parentNode; // SVG <a> elements have a lowercase name
	return node;
}

function handle_popstate(event) {
	scroll_history[cid] = scroll_state();

	if (event.state) {
		const url = new URL(location.href);
		const target = select_target(url);
		if (target) {
			navigate(target, event.state.id);
		} else {
			location.href = location.href;
		}
	} else {
		// hashchange
		set_uid(uid + 1);
		set_cid(uid);
		_history.replaceState({ id: cid }, '', location.href);
	}
}

var TYPE;
(function (TYPE) {
    /**
     * Raw text
     */
    TYPE[TYPE["literal"] = 0] = "literal";
    /**
     * Variable w/o any format, e.g `var` in `this is a {var}`
     */
    TYPE[TYPE["argument"] = 1] = "argument";
    /**
     * Variable w/ number format
     */
    TYPE[TYPE["number"] = 2] = "number";
    /**
     * Variable w/ date format
     */
    TYPE[TYPE["date"] = 3] = "date";
    /**
     * Variable w/ time format
     */
    TYPE[TYPE["time"] = 4] = "time";
    /**
     * Variable w/ select format
     */
    TYPE[TYPE["select"] = 5] = "select";
    /**
     * Variable w/ plural format
     */
    TYPE[TYPE["plural"] = 6] = "plural";
    /**
     * Only possible within plural argument.
     * This is the `#` symbol that will be substituted with the count.
     */
    TYPE[TYPE["pound"] = 7] = "pound";
})(TYPE || (TYPE = {}));
/**
 * Type Guards
 */
function isLiteralElement(el) {
    return el.type === TYPE.literal;
}
function isArgumentElement(el) {
    return el.type === TYPE.argument;
}
function isNumberElement(el) {
    return el.type === TYPE.number;
}
function isDateElement(el) {
    return el.type === TYPE.date;
}
function isTimeElement(el) {
    return el.type === TYPE.time;
}
function isSelectElement(el) {
    return el.type === TYPE.select;
}
function isPluralElement(el) {
    return el.type === TYPE.plural;
}
function isPoundElement(el) {
    return el.type === TYPE.pound;
}
function isNumberSkeleton(el) {
    return !!(el && typeof el === 'object' && el.type === 0 /* number */);
}
function isDateTimeSkeleton(el) {
    return !!(el && typeof el === 'object' && el.type === 1 /* dateTime */);
}

// tslint:disable:only-arrow-functions
// tslint:disable:object-literal-shorthand
// tslint:disable:trailing-comma
// tslint:disable:object-literal-sort-keys
// tslint:disable:one-variable-per-declaration
// tslint:disable:max-line-length
// tslint:disable:no-consecutive-blank-lines
// tslint:disable:align
var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var SyntaxError = /** @class */ (function (_super) {
    __extends(SyntaxError, _super);
    function SyntaxError(message, expected, found, location) {
        var _this = _super.call(this) || this;
        _this.message = message;
        _this.expected = expected;
        _this.found = found;
        _this.location = location;
        _this.name = "SyntaxError";
        if (typeof Error.captureStackTrace === "function") {
            Error.captureStackTrace(_this, SyntaxError);
        }
        return _this;
    }
    SyntaxError.buildMessage = function (expected, found) {
        function hex(ch) {
            return ch.charCodeAt(0).toString(16).toUpperCase();
        }
        function literalEscape(s) {
            return s
                .replace(/\\/g, "\\\\")
                .replace(/"/g, "\\\"")
                .replace(/\0/g, "\\0")
                .replace(/\t/g, "\\t")
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r")
                .replace(/[\x00-\x0F]/g, function (ch) { return "\\x0" + hex(ch); })
                .replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) { return "\\x" + hex(ch); });
        }
        function classEscape(s) {
            return s
                .replace(/\\/g, "\\\\")
                .replace(/\]/g, "\\]")
                .replace(/\^/g, "\\^")
                .replace(/-/g, "\\-")
                .replace(/\0/g, "\\0")
                .replace(/\t/g, "\\t")
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r")
                .replace(/[\x00-\x0F]/g, function (ch) { return "\\x0" + hex(ch); })
                .replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) { return "\\x" + hex(ch); });
        }
        function describeExpectation(expectation) {
            switch (expectation.type) {
                case "literal":
                    return "\"" + literalEscape(expectation.text) + "\"";
                case "class":
                    var escapedParts = expectation.parts.map(function (part) {
                        return Array.isArray(part)
                            ? classEscape(part[0]) + "-" + classEscape(part[1])
                            : classEscape(part);
                    });
                    return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
                case "any":
                    return "any character";
                case "end":
                    return "end of input";
                case "other":
                    return expectation.description;
            }
        }
        function describeExpected(expected1) {
            var descriptions = expected1.map(describeExpectation);
            var i;
            var j;
            descriptions.sort();
            if (descriptions.length > 0) {
                for (i = 1, j = 1; i < descriptions.length; i++) {
                    if (descriptions[i - 1] !== descriptions[i]) {
                        descriptions[j] = descriptions[i];
                        j++;
                    }
                }
                descriptions.length = j;
            }
            switch (descriptions.length) {
                case 1:
                    return descriptions[0];
                case 2:
                    return descriptions[0] + " or " + descriptions[1];
                default:
                    return descriptions.slice(0, -1).join(", ")
                        + ", or "
                        + descriptions[descriptions.length - 1];
            }
        }
        function describeFound(found1) {
            return found1 ? "\"" + literalEscape(found1) + "\"" : "end of input";
        }
        return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };
    return SyntaxError;
}(Error));
function peg$parse(input, options) {
    options = options !== undefined ? options : {};
    var peg$FAILED = {};
    var peg$startRuleFunctions = { start: peg$parsestart };
    var peg$startRuleFunction = peg$parsestart;
    var peg$c0 = function (parts) {
        return parts.join('');
    };
    var peg$c1 = function (messageText) {
        return __assign({ type: TYPE.literal, value: messageText }, insertLocation());
    };
    var peg$c2 = "#";
    var peg$c3 = peg$literalExpectation("#", false);
    var peg$c4 = function () {
        return __assign({ type: TYPE.pound }, insertLocation());
    };
    var peg$c5 = peg$otherExpectation("argumentElement");
    var peg$c6 = "{";
    var peg$c7 = peg$literalExpectation("{", false);
    var peg$c8 = "}";
    var peg$c9 = peg$literalExpectation("}", false);
    var peg$c10 = function (value) {
        return __assign({ type: TYPE.argument, value: value }, insertLocation());
    };
    var peg$c11 = peg$otherExpectation("numberSkeletonId");
    var peg$c12 = /^['\/{}]/;
    var peg$c13 = peg$classExpectation(["'", "/", "{", "}"], false, false);
    var peg$c14 = peg$anyExpectation();
    var peg$c15 = peg$otherExpectation("numberSkeletonTokenOption");
    var peg$c16 = "/";
    var peg$c17 = peg$literalExpectation("/", false);
    var peg$c18 = function (option) { return option; };
    var peg$c19 = peg$otherExpectation("numberSkeletonToken");
    var peg$c20 = function (stem, options) {
        return { stem: stem, options: options };
    };
    var peg$c21 = function (tokens) {
        return __assign({ type: 0 /* number */, tokens: tokens }, insertLocation());
    };
    var peg$c22 = "::";
    var peg$c23 = peg$literalExpectation("::", false);
    var peg$c24 = function (skeleton) { return skeleton; };
    var peg$c25 = function () { messageCtx.push('numberArgStyle'); return true; };
    var peg$c26 = function (style) {
        messageCtx.pop();
        return style.replace(/\s*$/, '');
    };
    var peg$c27 = ",";
    var peg$c28 = peg$literalExpectation(",", false);
    var peg$c29 = "number";
    var peg$c30 = peg$literalExpectation("number", false);
    var peg$c31 = function (value, type, style) {
        return __assign({ type: type === 'number' ? TYPE.number : type === 'date' ? TYPE.date : TYPE.time, style: style && style[2], value: value }, insertLocation());
    };
    var peg$c32 = "'";
    var peg$c33 = peg$literalExpectation("'", false);
    var peg$c34 = /^[^']/;
    var peg$c35 = peg$classExpectation(["'"], true, false);
    var peg$c36 = /^[^a-zA-Z'{}]/;
    var peg$c37 = peg$classExpectation([["a", "z"], ["A", "Z"], "'", "{", "}"], true, false);
    var peg$c38 = /^[a-zA-Z]/;
    var peg$c39 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false);
    var peg$c40 = function (pattern) {
        return __assign({ type: 1 /* dateTime */, pattern: pattern }, insertLocation());
    };
    var peg$c41 = function () { messageCtx.push('dateOrTimeArgStyle'); return true; };
    var peg$c42 = "date";
    var peg$c43 = peg$literalExpectation("date", false);
    var peg$c44 = "time";
    var peg$c45 = peg$literalExpectation("time", false);
    var peg$c46 = "plural";
    var peg$c47 = peg$literalExpectation("plural", false);
    var peg$c48 = "selectordinal";
    var peg$c49 = peg$literalExpectation("selectordinal", false);
    var peg$c50 = "offset:";
    var peg$c51 = peg$literalExpectation("offset:", false);
    var peg$c52 = function (value, pluralType, offset, options) {
        return __assign({ type: TYPE.plural, pluralType: pluralType === 'plural' ? 'cardinal' : 'ordinal', value: value, offset: offset ? offset[2] : 0, options: options.reduce(function (all, _a) {
                var id = _a.id, value = _a.value, optionLocation = _a.location;
                if (id in all) {
                    error("Duplicate option \"" + id + "\" in plural element: \"" + text() + "\"", location());
                }
                all[id] = {
                    value: value,
                    location: optionLocation
                };
                return all;
            }, {}) }, insertLocation());
    };
    var peg$c53 = "select";
    var peg$c54 = peg$literalExpectation("select", false);
    var peg$c55 = function (value, options) {
        return __assign({ type: TYPE.select, value: value, options: options.reduce(function (all, _a) {
                var id = _a.id, value = _a.value, optionLocation = _a.location;
                if (id in all) {
                    error("Duplicate option \"" + id + "\" in select element: \"" + text() + "\"", location());
                }
                all[id] = {
                    value: value,
                    location: optionLocation
                };
                return all;
            }, {}) }, insertLocation());
    };
    var peg$c56 = "=";
    var peg$c57 = peg$literalExpectation("=", false);
    var peg$c58 = function (id) { messageCtx.push('select'); return true; };
    var peg$c59 = function (id, value) {
        messageCtx.pop();
        return __assign({ id: id,
            value: value }, insertLocation());
    };
    var peg$c60 = function (id) { messageCtx.push('plural'); return true; };
    var peg$c61 = function (id, value) {
        messageCtx.pop();
        return __assign({ id: id,
            value: value }, insertLocation());
    };
    var peg$c62 = peg$otherExpectation("whitespace");
    var peg$c63 = /^[\t-\r \x85\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/;
    var peg$c64 = peg$classExpectation([["\t", "\r"], " ", "\x85", "\xA0", "\u1680", ["\u2000", "\u200A"], "\u2028", "\u2029", "\u202F", "\u205F", "\u3000"], false, false);
    var peg$c65 = peg$otherExpectation("syntax pattern");
    var peg$c66 = /^[!-\/:-@[-\^`{-~\xA1-\xA7\xA9\xAB\xAC\xAE\xB0\xB1\xB6\xBB\xBF\xD7\xF7\u2010-\u2027\u2030-\u203E\u2041-\u2053\u2055-\u205E\u2190-\u245F\u2500-\u2775\u2794-\u2BFF\u2E00-\u2E7F\u3001-\u3003\u3008-\u3020\u3030\uFD3E\uFD3F\uFE45\uFE46]/;
    var peg$c67 = peg$classExpectation([["!", "/"], [":", "@"], ["[", "^"], "`", ["{", "~"], ["\xA1", "\xA7"], "\xA9", "\xAB", "\xAC", "\xAE", "\xB0", "\xB1", "\xB6", "\xBB", "\xBF", "\xD7", "\xF7", ["\u2010", "\u2027"], ["\u2030", "\u203E"], ["\u2041", "\u2053"], ["\u2055", "\u205E"], ["\u2190", "\u245F"], ["\u2500", "\u2775"], ["\u2794", "\u2BFF"], ["\u2E00", "\u2E7F"], ["\u3001", "\u3003"], ["\u3008", "\u3020"], "\u3030", "\uFD3E", "\uFD3F", "\uFE45", "\uFE46"], false, false);
    var peg$c68 = peg$otherExpectation("optional whitespace");
    var peg$c69 = peg$otherExpectation("number");
    var peg$c70 = "-";
    var peg$c71 = peg$literalExpectation("-", false);
    var peg$c72 = function (negative, num) {
        return num
            ? negative
                ? -num
                : num
            : 0;
    };
    var peg$c74 = peg$otherExpectation("double apostrophes");
    var peg$c75 = "''";
    var peg$c76 = peg$literalExpectation("''", false);
    var peg$c77 = function () { return "'"; };
    var peg$c78 = function (escapedChar, quotedChars) {
        return escapedChar + quotedChars.replace("''", "'");
    };
    var peg$c79 = function (x) {
        return (x !== '{' &&
            !(isInPluralOption() && x === '#') &&
            !(isNestedMessageText() && x === '}'));
    };
    var peg$c80 = "\n";
    var peg$c81 = peg$literalExpectation("\n", false);
    var peg$c82 = function (x) {
        return x === '{' || x === '}' || (isInPluralOption() && x === '#');
    };
    var peg$c83 = peg$otherExpectation("argNameOrNumber");
    var peg$c84 = peg$otherExpectation("argNumber");
    var peg$c85 = "0";
    var peg$c86 = peg$literalExpectation("0", false);
    var peg$c87 = function () { return 0; };
    var peg$c88 = /^[1-9]/;
    var peg$c89 = peg$classExpectation([["1", "9"]], false, false);
    var peg$c90 = /^[0-9]/;
    var peg$c91 = peg$classExpectation([["0", "9"]], false, false);
    var peg$c92 = function (digits) {
        return parseInt(digits.join(''), 10);
    };
    var peg$c93 = peg$otherExpectation("argName");
    var peg$currPos = 0;
    var peg$savedPos = 0;
    var peg$posDetailsCache = [{ line: 1, column: 1 }];
    var peg$maxFailPos = 0;
    var peg$maxFailExpected = [];
    var peg$silentFails = 0;
    var peg$result;
    if (options.startRule !== undefined) {
        if (!(options.startRule in peg$startRuleFunctions)) {
            throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }
    function text() {
        return input.substring(peg$savedPos, peg$currPos);
    }
    function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
    }
    function error(message, location1) {
        location1 = location1 !== undefined
            ? location1
            : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location1);
    }
    function peg$literalExpectation(text1, ignoreCase) {
        return { type: "literal", text: text1, ignoreCase: ignoreCase };
    }
    function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
    }
    function peg$anyExpectation() {
        return { type: "any" };
    }
    function peg$endExpectation() {
        return { type: "end" };
    }
    function peg$otherExpectation(description) {
        return { type: "other", description: description };
    }
    function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos];
        var p;
        if (details) {
            return details;
        }
        else {
            p = pos - 1;
            while (!peg$posDetailsCache[p]) {
                p--;
            }
            details = peg$posDetailsCache[p];
            details = {
                line: details.line,
                column: details.column
            };
            while (p < pos) {
                if (input.charCodeAt(p) === 10) {
                    details.line++;
                    details.column = 1;
                }
                else {
                    details.column++;
                }
                p++;
            }
            peg$posDetailsCache[pos] = details;
            return details;
        }
    }
    function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos);
        var endPosDetails = peg$computePosDetails(endPos);
        return {
            start: {
                offset: startPos,
                line: startPosDetails.line,
                column: startPosDetails.column
            },
            end: {
                offset: endPos,
                line: endPosDetails.line,
                column: endPosDetails.column
            }
        };
    }
    function peg$fail(expected1) {
        if (peg$currPos < peg$maxFailPos) {
            return;
        }
        if (peg$currPos > peg$maxFailPos) {
            peg$maxFailPos = peg$currPos;
            peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected1);
    }
    function peg$buildSimpleError(message, location1) {
        return new SyntaxError(message, [], "", location1);
    }
    function peg$buildStructuredError(expected1, found, location1) {
        return new SyntaxError(SyntaxError.buildMessage(expected1, found), expected1, found, location1);
    }
    function peg$parsestart() {
        var s0;
        s0 = peg$parsemessage();
        return s0;
    }
    function peg$parsemessage() {
        var s0, s1;
        s0 = [];
        s1 = peg$parsemessageElement();
        while (s1 !== peg$FAILED) {
            s0.push(s1);
            s1 = peg$parsemessageElement();
        }
        return s0;
    }
    function peg$parsemessageElement() {
        var s0;
        s0 = peg$parseliteralElement();
        if (s0 === peg$FAILED) {
            s0 = peg$parseargumentElement();
            if (s0 === peg$FAILED) {
                s0 = peg$parsesimpleFormatElement();
                if (s0 === peg$FAILED) {
                    s0 = peg$parsepluralElement();
                    if (s0 === peg$FAILED) {
                        s0 = peg$parseselectElement();
                        if (s0 === peg$FAILED) {
                            s0 = peg$parsepoundElement();
                        }
                    }
                }
            }
        }
        return s0;
    }
    function peg$parsemessageText() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsedoubleApostrophes();
        if (s2 === peg$FAILED) {
            s2 = peg$parsequotedString();
            if (s2 === peg$FAILED) {
                s2 = peg$parseunquotedString();
            }
        }
        if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
                s1.push(s2);
                s2 = peg$parsedoubleApostrophes();
                if (s2 === peg$FAILED) {
                    s2 = peg$parsequotedString();
                    if (s2 === peg$FAILED) {
                        s2 = peg$parseunquotedString();
                    }
                }
            }
        }
        else {
            s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c0(s1);
        }
        s0 = s1;
        return s0;
    }
    function peg$parseliteralElement() {
        var s0, s1;
        s0 = peg$currPos;
        s1 = peg$parsemessageText();
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c1(s1);
        }
        s0 = s1;
        return s0;
    }
    function peg$parsepoundElement() {
        var s0, s1;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 35) {
            s1 = peg$c2;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c3);
            }
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c4();
        }
        s0 = s1;
        return s0;
    }
    function peg$parseargumentElement() {
        var s0, s1, s2, s3, s4, s5;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
            s1 = peg$c6;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c7);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
                s3 = peg$parseargNameOrNumber();
                if (s3 !== peg$FAILED) {
                    s4 = peg$parse_();
                    if (s4 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 125) {
                            s5 = peg$c8;
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c9);
                            }
                        }
                        if (s5 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c10(s3);
                            s0 = s1;
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c5);
            }
        }
        return s0;
    }
    function peg$parsenumberSkeletonId() {
        var s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$currPos;
        s3 = peg$currPos;
        peg$silentFails++;
        s4 = peg$parsewhiteSpace();
        if (s4 === peg$FAILED) {
            if (peg$c12.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c13);
                }
            }
        }
        peg$silentFails--;
        if (s4 === peg$FAILED) {
            s3 = undefined;
        }
        else {
            peg$currPos = s3;
            s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
            if (input.length > peg$currPos) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c14);
                }
            }
            if (s4 !== peg$FAILED) {
                s3 = [s3, s4];
                s2 = s3;
            }
            else {
                peg$currPos = s2;
                s2 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s2;
            s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
                s1.push(s2);
                s2 = peg$currPos;
                s3 = peg$currPos;
                peg$silentFails++;
                s4 = peg$parsewhiteSpace();
                if (s4 === peg$FAILED) {
                    if (peg$c12.test(input.charAt(peg$currPos))) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c13);
                        }
                    }
                }
                peg$silentFails--;
                if (s4 === peg$FAILED) {
                    s3 = undefined;
                }
                else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                }
                if (s3 !== peg$FAILED) {
                    if (input.length > peg$currPos) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c14);
                        }
                    }
                    if (s4 !== peg$FAILED) {
                        s3 = [s3, s4];
                        s2 = s3;
                    }
                    else {
                        peg$currPos = s2;
                        s2 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                }
            }
        }
        else {
            s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
            s0 = input.substring(s0, peg$currPos);
        }
        else {
            s0 = s1;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c11);
            }
        }
        return s0;
    }
    function peg$parsenumberSkeletonTokenOption() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 47) {
            s1 = peg$c16;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c17);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parsenumberSkeletonId();
            if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c18(s2);
                s0 = s1;
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c15);
            }
        }
        return s0;
    }
    function peg$parsenumberSkeletonToken() {
        var s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
            s2 = peg$parsenumberSkeletonId();
            if (s2 !== peg$FAILED) {
                s3 = [];
                s4 = peg$parsenumberSkeletonTokenOption();
                while (s4 !== peg$FAILED) {
                    s3.push(s4);
                    s4 = peg$parsenumberSkeletonTokenOption();
                }
                if (s3 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c20(s2, s3);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c19);
            }
        }
        return s0;
    }
    function peg$parsenumberSkeleton() {
        var s0, s1, s2;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsenumberSkeletonToken();
        if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
                s1.push(s2);
                s2 = peg$parsenumberSkeletonToken();
            }
        }
        else {
            s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c21(s1);
        }
        s0 = s1;
        return s0;
    }
    function peg$parsenumberArgStyle() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c22) {
            s1 = peg$c22;
            peg$currPos += 2;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c23);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parsenumberSkeleton();
            if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c24(s2);
                s0 = s1;
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            peg$savedPos = peg$currPos;
            s1 = peg$c25();
            if (s1) {
                s1 = undefined;
            }
            else {
                s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parsemessageText();
                if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c26(s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        return s0;
    }
    function peg$parsenumberFormatElement() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
            s1 = peg$c6;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c7);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
                s3 = peg$parseargNameOrNumber();
                if (s3 !== peg$FAILED) {
                    s4 = peg$parse_();
                    if (s4 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 44) {
                            s5 = peg$c27;
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c28);
                            }
                        }
                        if (s5 !== peg$FAILED) {
                            s6 = peg$parse_();
                            if (s6 !== peg$FAILED) {
                                if (input.substr(peg$currPos, 6) === peg$c29) {
                                    s7 = peg$c29;
                                    peg$currPos += 6;
                                }
                                else {
                                    s7 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                        peg$fail(peg$c30);
                                    }
                                }
                                if (s7 !== peg$FAILED) {
                                    s8 = peg$parse_();
                                    if (s8 !== peg$FAILED) {
                                        s9 = peg$currPos;
                                        if (input.charCodeAt(peg$currPos) === 44) {
                                            s10 = peg$c27;
                                            peg$currPos++;
                                        }
                                        else {
                                            s10 = peg$FAILED;
                                            if (peg$silentFails === 0) {
                                                peg$fail(peg$c28);
                                            }
                                        }
                                        if (s10 !== peg$FAILED) {
                                            s11 = peg$parse_();
                                            if (s11 !== peg$FAILED) {
                                                s12 = peg$parsenumberArgStyle();
                                                if (s12 !== peg$FAILED) {
                                                    s10 = [s10, s11, s12];
                                                    s9 = s10;
                                                }
                                                else {
                                                    peg$currPos = s9;
                                                    s9 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s9;
                                                s9 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s9;
                                            s9 = peg$FAILED;
                                        }
                                        if (s9 === peg$FAILED) {
                                            s9 = null;
                                        }
                                        if (s9 !== peg$FAILED) {
                                            s10 = peg$parse_();
                                            if (s10 !== peg$FAILED) {
                                                if (input.charCodeAt(peg$currPos) === 125) {
                                                    s11 = peg$c8;
                                                    peg$currPos++;
                                                }
                                                else {
                                                    s11 = peg$FAILED;
                                                    if (peg$silentFails === 0) {
                                                        peg$fail(peg$c9);
                                                    }
                                                }
                                                if (s11 !== peg$FAILED) {
                                                    peg$savedPos = s0;
                                                    s1 = peg$c31(s3, s7, s9);
                                                    s0 = s1;
                                                }
                                                else {
                                                    peg$currPos = s0;
                                                    s0 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s0;
                                                s0 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s0;
                                            s0 = peg$FAILED;
                                        }
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parsedateTimeSkeletonLiteral() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 39) {
            s1 = peg$c32;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c33);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$parsedoubleApostrophes();
            if (s3 === peg$FAILED) {
                if (peg$c34.test(input.charAt(peg$currPos))) {
                    s3 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c35);
                    }
                }
            }
            if (s3 !== peg$FAILED) {
                while (s3 !== peg$FAILED) {
                    s2.push(s3);
                    s3 = peg$parsedoubleApostrophes();
                    if (s3 === peg$FAILED) {
                        if (peg$c34.test(input.charAt(peg$currPos))) {
                            s3 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s3 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c35);
                            }
                        }
                    }
                }
            }
            else {
                s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 39) {
                    s3 = peg$c32;
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c33);
                    }
                }
                if (s3 !== peg$FAILED) {
                    s1 = [s1, s2, s3];
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = [];
            s1 = peg$parsedoubleApostrophes();
            if (s1 === peg$FAILED) {
                if (peg$c36.test(input.charAt(peg$currPos))) {
                    s1 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c37);
                    }
                }
            }
            if (s1 !== peg$FAILED) {
                while (s1 !== peg$FAILED) {
                    s0.push(s1);
                    s1 = peg$parsedoubleApostrophes();
                    if (s1 === peg$FAILED) {
                        if (peg$c36.test(input.charAt(peg$currPos))) {
                            s1 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s1 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c37);
                            }
                        }
                    }
                }
            }
            else {
                s0 = peg$FAILED;
            }
        }
        return s0;
    }
    function peg$parsedateTimeSkeletonPattern() {
        var s0, s1;
        s0 = [];
        if (peg$c38.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c39);
            }
        }
        if (s1 !== peg$FAILED) {
            while (s1 !== peg$FAILED) {
                s0.push(s1);
                if (peg$c38.test(input.charAt(peg$currPos))) {
                    s1 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c39);
                    }
                }
            }
        }
        else {
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parsedateTimeSkeleton() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = [];
        s3 = peg$parsedateTimeSkeletonLiteral();
        if (s3 === peg$FAILED) {
            s3 = peg$parsedateTimeSkeletonPattern();
        }
        if (s3 !== peg$FAILED) {
            while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$parsedateTimeSkeletonLiteral();
                if (s3 === peg$FAILED) {
                    s3 = peg$parsedateTimeSkeletonPattern();
                }
            }
        }
        else {
            s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
            s1 = input.substring(s1, peg$currPos);
        }
        else {
            s1 = s2;
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c40(s1);
        }
        s0 = s1;
        return s0;
    }
    function peg$parsedateOrTimeArgStyle() {
        var s0, s1, s2;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c22) {
            s1 = peg$c22;
            peg$currPos += 2;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c23);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parsedateTimeSkeleton();
            if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c24(s2);
                s0 = s1;
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            peg$savedPos = peg$currPos;
            s1 = peg$c41();
            if (s1) {
                s1 = undefined;
            }
            else {
                s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parsemessageText();
                if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c26(s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        return s0;
    }
    function peg$parsedateOrTimeFormatElement() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
            s1 = peg$c6;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c7);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
                s3 = peg$parseargNameOrNumber();
                if (s3 !== peg$FAILED) {
                    s4 = peg$parse_();
                    if (s4 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 44) {
                            s5 = peg$c27;
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c28);
                            }
                        }
                        if (s5 !== peg$FAILED) {
                            s6 = peg$parse_();
                            if (s6 !== peg$FAILED) {
                                if (input.substr(peg$currPos, 4) === peg$c42) {
                                    s7 = peg$c42;
                                    peg$currPos += 4;
                                }
                                else {
                                    s7 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                        peg$fail(peg$c43);
                                    }
                                }
                                if (s7 === peg$FAILED) {
                                    if (input.substr(peg$currPos, 4) === peg$c44) {
                                        s7 = peg$c44;
                                        peg$currPos += 4;
                                    }
                                    else {
                                        s7 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                            peg$fail(peg$c45);
                                        }
                                    }
                                }
                                if (s7 !== peg$FAILED) {
                                    s8 = peg$parse_();
                                    if (s8 !== peg$FAILED) {
                                        s9 = peg$currPos;
                                        if (input.charCodeAt(peg$currPos) === 44) {
                                            s10 = peg$c27;
                                            peg$currPos++;
                                        }
                                        else {
                                            s10 = peg$FAILED;
                                            if (peg$silentFails === 0) {
                                                peg$fail(peg$c28);
                                            }
                                        }
                                        if (s10 !== peg$FAILED) {
                                            s11 = peg$parse_();
                                            if (s11 !== peg$FAILED) {
                                                s12 = peg$parsedateOrTimeArgStyle();
                                                if (s12 !== peg$FAILED) {
                                                    s10 = [s10, s11, s12];
                                                    s9 = s10;
                                                }
                                                else {
                                                    peg$currPos = s9;
                                                    s9 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s9;
                                                s9 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s9;
                                            s9 = peg$FAILED;
                                        }
                                        if (s9 === peg$FAILED) {
                                            s9 = null;
                                        }
                                        if (s9 !== peg$FAILED) {
                                            s10 = peg$parse_();
                                            if (s10 !== peg$FAILED) {
                                                if (input.charCodeAt(peg$currPos) === 125) {
                                                    s11 = peg$c8;
                                                    peg$currPos++;
                                                }
                                                else {
                                                    s11 = peg$FAILED;
                                                    if (peg$silentFails === 0) {
                                                        peg$fail(peg$c9);
                                                    }
                                                }
                                                if (s11 !== peg$FAILED) {
                                                    peg$savedPos = s0;
                                                    s1 = peg$c31(s3, s7, s9);
                                                    s0 = s1;
                                                }
                                                else {
                                                    peg$currPos = s0;
                                                    s0 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s0;
                                                s0 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s0;
                                            s0 = peg$FAILED;
                                        }
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parsesimpleFormatElement() {
        var s0;
        s0 = peg$parsenumberFormatElement();
        if (s0 === peg$FAILED) {
            s0 = peg$parsedateOrTimeFormatElement();
        }
        return s0;
    }
    function peg$parsepluralElement() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
            s1 = peg$c6;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c7);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
                s3 = peg$parseargNameOrNumber();
                if (s3 !== peg$FAILED) {
                    s4 = peg$parse_();
                    if (s4 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 44) {
                            s5 = peg$c27;
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c28);
                            }
                        }
                        if (s5 !== peg$FAILED) {
                            s6 = peg$parse_();
                            if (s6 !== peg$FAILED) {
                                if (input.substr(peg$currPos, 6) === peg$c46) {
                                    s7 = peg$c46;
                                    peg$currPos += 6;
                                }
                                else {
                                    s7 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                        peg$fail(peg$c47);
                                    }
                                }
                                if (s7 === peg$FAILED) {
                                    if (input.substr(peg$currPos, 13) === peg$c48) {
                                        s7 = peg$c48;
                                        peg$currPos += 13;
                                    }
                                    else {
                                        s7 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                            peg$fail(peg$c49);
                                        }
                                    }
                                }
                                if (s7 !== peg$FAILED) {
                                    s8 = peg$parse_();
                                    if (s8 !== peg$FAILED) {
                                        if (input.charCodeAt(peg$currPos) === 44) {
                                            s9 = peg$c27;
                                            peg$currPos++;
                                        }
                                        else {
                                            s9 = peg$FAILED;
                                            if (peg$silentFails === 0) {
                                                peg$fail(peg$c28);
                                            }
                                        }
                                        if (s9 !== peg$FAILED) {
                                            s10 = peg$parse_();
                                            if (s10 !== peg$FAILED) {
                                                s11 = peg$currPos;
                                                if (input.substr(peg$currPos, 7) === peg$c50) {
                                                    s12 = peg$c50;
                                                    peg$currPos += 7;
                                                }
                                                else {
                                                    s12 = peg$FAILED;
                                                    if (peg$silentFails === 0) {
                                                        peg$fail(peg$c51);
                                                    }
                                                }
                                                if (s12 !== peg$FAILED) {
                                                    s13 = peg$parse_();
                                                    if (s13 !== peg$FAILED) {
                                                        s14 = peg$parsenumber();
                                                        if (s14 !== peg$FAILED) {
                                                            s12 = [s12, s13, s14];
                                                            s11 = s12;
                                                        }
                                                        else {
                                                            peg$currPos = s11;
                                                            s11 = peg$FAILED;
                                                        }
                                                    }
                                                    else {
                                                        peg$currPos = s11;
                                                        s11 = peg$FAILED;
                                                    }
                                                }
                                                else {
                                                    peg$currPos = s11;
                                                    s11 = peg$FAILED;
                                                }
                                                if (s11 === peg$FAILED) {
                                                    s11 = null;
                                                }
                                                if (s11 !== peg$FAILED) {
                                                    s12 = peg$parse_();
                                                    if (s12 !== peg$FAILED) {
                                                        s13 = [];
                                                        s14 = peg$parsepluralOption();
                                                        if (s14 !== peg$FAILED) {
                                                            while (s14 !== peg$FAILED) {
                                                                s13.push(s14);
                                                                s14 = peg$parsepluralOption();
                                                            }
                                                        }
                                                        else {
                                                            s13 = peg$FAILED;
                                                        }
                                                        if (s13 !== peg$FAILED) {
                                                            s14 = peg$parse_();
                                                            if (s14 !== peg$FAILED) {
                                                                if (input.charCodeAt(peg$currPos) === 125) {
                                                                    s15 = peg$c8;
                                                                    peg$currPos++;
                                                                }
                                                                else {
                                                                    s15 = peg$FAILED;
                                                                    if (peg$silentFails === 0) {
                                                                        peg$fail(peg$c9);
                                                                    }
                                                                }
                                                                if (s15 !== peg$FAILED) {
                                                                    peg$savedPos = s0;
                                                                    s1 = peg$c52(s3, s7, s11, s13);
                                                                    s0 = s1;
                                                                }
                                                                else {
                                                                    peg$currPos = s0;
                                                                    s0 = peg$FAILED;
                                                                }
                                                            }
                                                            else {
                                                                peg$currPos = s0;
                                                                s0 = peg$FAILED;
                                                            }
                                                        }
                                                        else {
                                                            peg$currPos = s0;
                                                            s0 = peg$FAILED;
                                                        }
                                                    }
                                                    else {
                                                        peg$currPos = s0;
                                                        s0 = peg$FAILED;
                                                    }
                                                }
                                                else {
                                                    peg$currPos = s0;
                                                    s0 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s0;
                                                s0 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s0;
                                            s0 = peg$FAILED;
                                        }
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseselectElement() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
            s1 = peg$c6;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c7);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
                s3 = peg$parseargNameOrNumber();
                if (s3 !== peg$FAILED) {
                    s4 = peg$parse_();
                    if (s4 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 44) {
                            s5 = peg$c27;
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c28);
                            }
                        }
                        if (s5 !== peg$FAILED) {
                            s6 = peg$parse_();
                            if (s6 !== peg$FAILED) {
                                if (input.substr(peg$currPos, 6) === peg$c53) {
                                    s7 = peg$c53;
                                    peg$currPos += 6;
                                }
                                else {
                                    s7 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                        peg$fail(peg$c54);
                                    }
                                }
                                if (s7 !== peg$FAILED) {
                                    s8 = peg$parse_();
                                    if (s8 !== peg$FAILED) {
                                        if (input.charCodeAt(peg$currPos) === 44) {
                                            s9 = peg$c27;
                                            peg$currPos++;
                                        }
                                        else {
                                            s9 = peg$FAILED;
                                            if (peg$silentFails === 0) {
                                                peg$fail(peg$c28);
                                            }
                                        }
                                        if (s9 !== peg$FAILED) {
                                            s10 = peg$parse_();
                                            if (s10 !== peg$FAILED) {
                                                s11 = [];
                                                s12 = peg$parseselectOption();
                                                if (s12 !== peg$FAILED) {
                                                    while (s12 !== peg$FAILED) {
                                                        s11.push(s12);
                                                        s12 = peg$parseselectOption();
                                                    }
                                                }
                                                else {
                                                    s11 = peg$FAILED;
                                                }
                                                if (s11 !== peg$FAILED) {
                                                    s12 = peg$parse_();
                                                    if (s12 !== peg$FAILED) {
                                                        if (input.charCodeAt(peg$currPos) === 125) {
                                                            s13 = peg$c8;
                                                            peg$currPos++;
                                                        }
                                                        else {
                                                            s13 = peg$FAILED;
                                                            if (peg$silentFails === 0) {
                                                                peg$fail(peg$c9);
                                                            }
                                                        }
                                                        if (s13 !== peg$FAILED) {
                                                            peg$savedPos = s0;
                                                            s1 = peg$c55(s3, s11);
                                                            s0 = s1;
                                                        }
                                                        else {
                                                            peg$currPos = s0;
                                                            s0 = peg$FAILED;
                                                        }
                                                    }
                                                    else {
                                                        peg$currPos = s0;
                                                        s0 = peg$FAILED;
                                                    }
                                                }
                                                else {
                                                    peg$currPos = s0;
                                                    s0 = peg$FAILED;
                                                }
                                            }
                                            else {
                                                peg$currPos = s0;
                                                s0 = peg$FAILED;
                                            }
                                        }
                                        else {
                                            peg$currPos = s0;
                                            s0 = peg$FAILED;
                                        }
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parsepluralRuleSelectValue() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 61) {
            s2 = peg$c56;
            peg$currPos++;
        }
        else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c57);
            }
        }
        if (s2 !== peg$FAILED) {
            s3 = peg$parsenumber();
            if (s3 !== peg$FAILED) {
                s2 = [s2, s3];
                s1 = s2;
            }
            else {
                peg$currPos = s1;
                s1 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s1;
            s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
            s0 = input.substring(s0, peg$currPos);
        }
        else {
            s0 = s1;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$parseargName();
        }
        return s0;
    }
    function peg$parseselectOption() {
        var s0, s1, s2, s3, s4, s5, s6, s7;
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
            s2 = peg$parseargName();
            if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 123) {
                        s4 = peg$c6;
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c7);
                        }
                    }
                    if (s4 !== peg$FAILED) {
                        peg$savedPos = peg$currPos;
                        s5 = peg$c58();
                        if (s5) {
                            s5 = undefined;
                        }
                        else {
                            s5 = peg$FAILED;
                        }
                        if (s5 !== peg$FAILED) {
                            s6 = peg$parsemessage();
                            if (s6 !== peg$FAILED) {
                                if (input.charCodeAt(peg$currPos) === 125) {
                                    s7 = peg$c8;
                                    peg$currPos++;
                                }
                                else {
                                    s7 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                        peg$fail(peg$c9);
                                    }
                                }
                                if (s7 !== peg$FAILED) {
                                    peg$savedPos = s0;
                                    s1 = peg$c59(s2, s6);
                                    s0 = s1;
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parsepluralOption() {
        var s0, s1, s2, s3, s4, s5, s6, s7;
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
            s2 = peg$parsepluralRuleSelectValue();
            if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 123) {
                        s4 = peg$c6;
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c7);
                        }
                    }
                    if (s4 !== peg$FAILED) {
                        peg$savedPos = peg$currPos;
                        s5 = peg$c60();
                        if (s5) {
                            s5 = undefined;
                        }
                        else {
                            s5 = peg$FAILED;
                        }
                        if (s5 !== peg$FAILED) {
                            s6 = peg$parsemessage();
                            if (s6 !== peg$FAILED) {
                                if (input.charCodeAt(peg$currPos) === 125) {
                                    s7 = peg$c8;
                                    peg$currPos++;
                                }
                                else {
                                    s7 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                        peg$fail(peg$c9);
                                    }
                                }
                                if (s7 !== peg$FAILED) {
                                    peg$savedPos = s0;
                                    s1 = peg$c61(s2, s6);
                                    s0 = s1;
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                            }
                            else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parsewhiteSpace() {
        var s0;
        peg$silentFails++;
        if (peg$c63.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c64);
            }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            if (peg$silentFails === 0) {
                peg$fail(peg$c62);
            }
        }
        return s0;
    }
    function peg$parsepatternSyntax() {
        var s0;
        peg$silentFails++;
        if (peg$c66.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c67);
            }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            if (peg$silentFails === 0) {
                peg$fail(peg$c65);
            }
        }
        return s0;
    }
    function peg$parse_() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsewhiteSpace();
        while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsewhiteSpace();
        }
        if (s1 !== peg$FAILED) {
            s0 = input.substring(s0, peg$currPos);
        }
        else {
            s0 = s1;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c68);
            }
        }
        return s0;
    }
    function peg$parsenumber() {
        var s0, s1, s2;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 45) {
            s1 = peg$c70;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c71);
            }
        }
        if (s1 === peg$FAILED) {
            s1 = null;
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parseargNumber();
            if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c72(s1, s2);
                s0 = s1;
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c69);
            }
        }
        return s0;
    }
    function peg$parsedoubleApostrophes() {
        var s0, s1;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c75) {
            s1 = peg$c75;
            peg$currPos += 2;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c76);
            }
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c77();
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c74);
            }
        }
        return s0;
    }
    function peg$parsequotedString() {
        var s0, s1, s2, s3, s4, s5;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 39) {
            s1 = peg$c32;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c33);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parseescapedChar();
            if (s2 !== peg$FAILED) {
                s3 = peg$currPos;
                s4 = [];
                if (input.substr(peg$currPos, 2) === peg$c75) {
                    s5 = peg$c75;
                    peg$currPos += 2;
                }
                else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c76);
                    }
                }
                if (s5 === peg$FAILED) {
                    if (peg$c34.test(input.charAt(peg$currPos))) {
                        s5 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s5 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c35);
                        }
                    }
                }
                while (s5 !== peg$FAILED) {
                    s4.push(s5);
                    if (input.substr(peg$currPos, 2) === peg$c75) {
                        s5 = peg$c75;
                        peg$currPos += 2;
                    }
                    else {
                        s5 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c76);
                        }
                    }
                    if (s5 === peg$FAILED) {
                        if (peg$c34.test(input.charAt(peg$currPos))) {
                            s5 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c35);
                            }
                        }
                    }
                }
                if (s4 !== peg$FAILED) {
                    s3 = input.substring(s3, peg$currPos);
                }
                else {
                    s3 = s4;
                }
                if (s3 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 39) {
                        s4 = peg$c32;
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c33);
                        }
                    }
                    if (s4 === peg$FAILED) {
                        s4 = null;
                    }
                    if (s4 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c78(s2, s3);
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseunquotedString() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c14);
            }
        }
        if (s2 !== peg$FAILED) {
            peg$savedPos = peg$currPos;
            s3 = peg$c79(s2);
            if (s3) {
                s3 = undefined;
            }
            else {
                s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
                s2 = [s2, s3];
                s1 = s2;
            }
            else {
                peg$currPos = s1;
                s1 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s1;
            s1 = peg$FAILED;
        }
        if (s1 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 10) {
                s1 = peg$c80;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c81);
                }
            }
        }
        if (s1 !== peg$FAILED) {
            s0 = input.substring(s0, peg$currPos);
        }
        else {
            s0 = s1;
        }
        return s0;
    }
    function peg$parseescapedChar() {
        var s0, s1, s2, s3;
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c14);
            }
        }
        if (s2 !== peg$FAILED) {
            peg$savedPos = peg$currPos;
            s3 = peg$c82(s2);
            if (s3) {
                s3 = undefined;
            }
            else {
                s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
                s2 = [s2, s3];
                s1 = s2;
            }
            else {
                peg$currPos = s1;
                s1 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s1;
            s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
            s0 = input.substring(s0, peg$currPos);
        }
        else {
            s0 = s1;
        }
        return s0;
    }
    function peg$parseargNameOrNumber() {
        var s0, s1;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parseargNumber();
        if (s1 === peg$FAILED) {
            s1 = peg$parseargName();
        }
        if (s1 !== peg$FAILED) {
            s0 = input.substring(s0, peg$currPos);
        }
        else {
            s0 = s1;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c83);
            }
        }
        return s0;
    }
    function peg$parseargNumber() {
        var s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 48) {
            s1 = peg$c85;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c86);
            }
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c87();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$currPos;
            if (peg$c88.test(input.charAt(peg$currPos))) {
                s2 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c89);
                }
            }
            if (s2 !== peg$FAILED) {
                s3 = [];
                if (peg$c90.test(input.charAt(peg$currPos))) {
                    s4 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c91);
                    }
                }
                while (s4 !== peg$FAILED) {
                    s3.push(s4);
                    if (peg$c90.test(input.charAt(peg$currPos))) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c91);
                        }
                    }
                }
                if (s3 !== peg$FAILED) {
                    s2 = [s2, s3];
                    s1 = s2;
                }
                else {
                    peg$currPos = s1;
                    s1 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s1;
                s1 = peg$FAILED;
            }
            if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c92(s1);
            }
            s0 = s1;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c84);
            }
        }
        return s0;
    }
    function peg$parseargName() {
        var s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$currPos;
        s3 = peg$currPos;
        peg$silentFails++;
        s4 = peg$parsewhiteSpace();
        if (s4 === peg$FAILED) {
            s4 = peg$parsepatternSyntax();
        }
        peg$silentFails--;
        if (s4 === peg$FAILED) {
            s3 = undefined;
        }
        else {
            peg$currPos = s3;
            s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
            if (input.length > peg$currPos) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c14);
                }
            }
            if (s4 !== peg$FAILED) {
                s3 = [s3, s4];
                s2 = s3;
            }
            else {
                peg$currPos = s2;
                s2 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s2;
            s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
                s1.push(s2);
                s2 = peg$currPos;
                s3 = peg$currPos;
                peg$silentFails++;
                s4 = peg$parsewhiteSpace();
                if (s4 === peg$FAILED) {
                    s4 = peg$parsepatternSyntax();
                }
                peg$silentFails--;
                if (s4 === peg$FAILED) {
                    s3 = undefined;
                }
                else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                }
                if (s3 !== peg$FAILED) {
                    if (input.length > peg$currPos) {
                        s4 = input.charAt(peg$currPos);
                        peg$currPos++;
                    }
                    else {
                        s4 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c14);
                        }
                    }
                    if (s4 !== peg$FAILED) {
                        s3 = [s3, s4];
                        s2 = s3;
                    }
                    else {
                        peg$currPos = s2;
                        s2 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                }
            }
        }
        else {
            s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
            s0 = input.substring(s0, peg$currPos);
        }
        else {
            s0 = s1;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c93);
            }
        }
        return s0;
    }
    var messageCtx = ['root'];
    function isNestedMessageText() {
        return messageCtx.length > 1;
    }
    function isInPluralOption() {
        return messageCtx[messageCtx.length - 1] === 'plural';
    }
    function insertLocation() {
        return options && options.captureLocation ? {
            location: location()
        } : {};
    }
    peg$result = peg$startRuleFunction();
    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
    }
    else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
            peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length
            ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
            : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
    }
}
var pegParse = peg$parse;

var __spreadArrays = (undefined && undefined.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var PLURAL_HASHTAG_REGEX = /(^|[^\\])#/g;
/**
 * Whether to convert `#` in plural rule options
 * to `{var, number}`
 * @param el AST Element
 * @param pluralStack current plural stack
 */
function normalizeHashtagInPlural(els) {
    els.forEach(function (el) {
        // If we're encountering a plural el
        if (!isPluralElement(el) && !isSelectElement(el)) {
            return;
        }
        // Go down the options and search for # in any literal element
        Object.keys(el.options).forEach(function (id) {
            var _a;
            var opt = el.options[id];
            // If we got a match, we have to split this
            // and inject a NumberElement in the middle
            var matchingLiteralElIndex = -1;
            var literalEl = undefined;
            for (var i = 0; i < opt.value.length; i++) {
                var el_1 = opt.value[i];
                if (isLiteralElement(el_1) && PLURAL_HASHTAG_REGEX.test(el_1.value)) {
                    matchingLiteralElIndex = i;
                    literalEl = el_1;
                    break;
                }
            }
            if (literalEl) {
                var newValue = literalEl.value.replace(PLURAL_HASHTAG_REGEX, "$1{" + el.value + ", number}");
                var newEls = pegParse(newValue);
                (_a = opt.value).splice.apply(_a, __spreadArrays([matchingLiteralElIndex, 1], newEls));
            }
            normalizeHashtagInPlural(opt.value);
        });
    });
}

var __assign$1 = (undefined && undefined.__assign) || function () {
    __assign$1 = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign$1.apply(this, arguments);
};
/**
 * https://unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
 * Credit: https://github.com/caridy/intl-datetimeformat-pattern/blob/master/index.js
 * with some tweaks
 */
var DATE_TIME_REGEX = /(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;
/**
 * Parse Date time skeleton into Intl.DateTimeFormatOptions
 * Ref: https://unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
 * @public
 * @param skeleton skeleton string
 */
function parseDateTimeSkeleton(skeleton) {
    var result = {};
    skeleton.replace(DATE_TIME_REGEX, function (match) {
        var len = match.length;
        switch (match[0]) {
            // Era
            case 'G':
                result.era = len === 4 ? 'long' : len === 5 ? 'narrow' : 'short';
                break;
            // Year
            case 'y':
                result.year = len === 2 ? '2-digit' : 'numeric';
                break;
            case 'Y':
            case 'u':
            case 'U':
            case 'r':
                throw new RangeError('`Y/u/U/r` (year) patterns are not supported, use `y` instead');
            // Quarter
            case 'q':
            case 'Q':
                throw new RangeError('`q/Q` (quarter) patterns are not supported');
            // Month
            case 'M':
            case 'L':
                result.month = ['numeric', '2-digit', 'short', 'long', 'narrow'][len - 1];
                break;
            // Week
            case 'w':
            case 'W':
                throw new RangeError('`w/W` (week) patterns are not supported');
            case 'd':
                result.day = ['numeric', '2-digit'][len - 1];
                break;
            case 'D':
            case 'F':
            case 'g':
                throw new RangeError('`D/F/g` (day) patterns are not supported, use `d` instead');
            // Weekday
            case 'E':
                result.weekday = len === 4 ? 'short' : len === 5 ? 'narrow' : 'short';
                break;
            case 'e':
                if (len < 4) {
                    throw new RangeError('`e..eee` (weekday) patterns are not supported');
                }
                result.weekday = ['short', 'long', 'narrow', 'short'][len - 4];
                break;
            case 'c':
                if (len < 4) {
                    throw new RangeError('`c..ccc` (weekday) patterns are not supported');
                }
                result.weekday = ['short', 'long', 'narrow', 'short'][len - 4];
                break;
            // Period
            case 'a': // AM, PM
                result.hour12 = true;
                break;
            case 'b': // am, pm, noon, midnight
            case 'B': // flexible day periods
                throw new RangeError('`b/B` (period) patterns are not supported, use `a` instead');
            // Hour
            case 'h':
                result.hourCycle = 'h12';
                result.hour = ['numeric', '2-digit'][len - 1];
                break;
            case 'H':
                result.hourCycle = 'h23';
                result.hour = ['numeric', '2-digit'][len - 1];
                break;
            case 'K':
                result.hourCycle = 'h11';
                result.hour = ['numeric', '2-digit'][len - 1];
                break;
            case 'k':
                result.hourCycle = 'h24';
                result.hour = ['numeric', '2-digit'][len - 1];
                break;
            case 'j':
            case 'J':
            case 'C':
                throw new RangeError('`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead');
            // Minute
            case 'm':
                result.minute = ['numeric', '2-digit'][len - 1];
                break;
            // Second
            case 's':
                result.second = ['numeric', '2-digit'][len - 1];
                break;
            case 'S':
            case 'A':
                throw new RangeError('`S/A` (second) pattenrs are not supported, use `s` instead');
            // Zone
            case 'z': // 1..3, 4: specific non-location format
                result.timeZoneName = len < 4 ? 'short' : 'long';
                break;
            case 'Z': // 1..3, 4, 5: The ISO8601 varios formats
            case 'O': // 1, 4: miliseconds in day short, long
            case 'v': // 1, 4: generic non-location format
            case 'V': // 1, 2, 3, 4: time zone ID or city
            case 'X': // 1, 2, 3, 4: The ISO8601 varios formats
            case 'x': // 1, 2, 3, 4: The ISO8601 varios formats
                throw new RangeError('`Z/O/v/V/X/x` (timeZone) pattenrs are not supported, use `z` instead');
        }
        return '';
    });
    return result;
}
function icuUnitToEcma(unit) {
    return unit.replace(/^(.*?)-/, '');
}
var FRACTION_PRECISION_REGEX = /^\.(?:(0+)(\+|#+)?)?$/g;
var SIGNIFICANT_PRECISION_REGEX = /^(@+)?(\+|#+)?$/g;
function parseSignificantPrecision(str) {
    var result = {};
    str.replace(SIGNIFICANT_PRECISION_REGEX, function (_, g1, g2) {
        // @@@ case
        if (typeof g2 !== 'string') {
            result.minimumSignificantDigits = g1.length;
            result.maximumSignificantDigits = g1.length;
        }
        // @@@+ case
        else if (g2 === '+') {
            result.minimumSignificantDigits = g1.length;
        }
        // .### case
        else if (g1[0] === '#') {
            result.maximumSignificantDigits = g1.length;
        }
        // .@@## or .@@@ case
        else {
            result.minimumSignificantDigits = g1.length;
            result.maximumSignificantDigits =
                g1.length + (typeof g2 === 'string' ? g2.length : 0);
        }
        return '';
    });
    return result;
}
function parseSign(str) {
    switch (str) {
        case 'sign-auto':
            return {
                signDisplay: 'auto',
            };
        case 'sign-accounting':
            return {
                currencySign: 'accounting',
            };
        case 'sign-always':
            return {
                signDisplay: 'always',
            };
        case 'sign-accounting-always':
            return {
                signDisplay: 'always',
                currencySign: 'accounting',
            };
        case 'sign-except-zero':
            return {
                signDisplay: 'exceptZero',
            };
        case 'sign-accounting-except-zero':
            return {
                signDisplay: 'exceptZero',
                currencySign: 'accounting',
            };
        case 'sign-never':
            return {
                signDisplay: 'never',
            };
    }
}
function parseNotationOptions(opt) {
    var result = {};
    var signOpts = parseSign(opt);
    if (signOpts) {
        return signOpts;
    }
    return result;
}
/**
 * https://github.com/unicode-org/icu/blob/master/docs/userguide/format_parse/numbers/skeletons.md#skeleton-stems-and-options
 */
function convertNumberSkeletonToNumberFormatOptions(tokens) {
    var result = {};
    for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
        var token = tokens_1[_i];
        switch (token.stem) {
            case 'percent':
                result.style = 'percent';
                continue;
            case 'currency':
                result.style = 'currency';
                result.currency = token.options[0];
                continue;
            case 'group-off':
                result.useGrouping = false;
                continue;
            case 'precision-integer':
                result.maximumFractionDigits = 0;
                continue;
            case 'measure-unit':
                result.style = 'unit';
                result.unit = icuUnitToEcma(token.options[0]);
                continue;
            case 'compact-short':
                result.notation = 'compact';
                result.compactDisplay = 'short';
                continue;
            case 'compact-long':
                result.notation = 'compact';
                result.compactDisplay = 'long';
                continue;
            case 'scientific':
                result = __assign$1(__assign$1(__assign$1({}, result), { notation: 'scientific' }), token.options.reduce(function (all, opt) { return (__assign$1(__assign$1({}, all), parseNotationOptions(opt))); }, {}));
                continue;
            case 'engineering':
                result = __assign$1(__assign$1(__assign$1({}, result), { notation: 'engineering' }), token.options.reduce(function (all, opt) { return (__assign$1(__assign$1({}, all), parseNotationOptions(opt))); }, {}));
                continue;
            case 'notation-simple':
                result.notation = 'standard';
                continue;
            // https://github.com/unicode-org/icu/blob/master/icu4c/source/i18n/unicode/unumberformatter.h
            case 'unit-width-narrow':
                result.currencyDisplay = 'narrowSymbol';
                result.unitDisplay = 'narrow';
                continue;
            case 'unit-width-short':
                result.currencyDisplay = 'code';
                result.unitDisplay = 'short';
                continue;
            case 'unit-width-full-name':
                result.currencyDisplay = 'name';
                result.unitDisplay = 'long';
                continue;
            case 'unit-width-iso-code':
                result.currencyDisplay = 'symbol';
                continue;
        }
        // Precision
        // https://github.com/unicode-org/icu/blob/master/docs/userguide/format_parse/numbers/skeletons.md#fraction-precision
        if (FRACTION_PRECISION_REGEX.test(token.stem)) {
            if (token.options.length > 1) {
                throw new RangeError('Fraction-precision stems only accept a single optional option');
            }
            token.stem.replace(FRACTION_PRECISION_REGEX, function (match, g1, g2) {
                // precision-integer case
                if (match === '.') {
                    result.maximumFractionDigits = 0;
                }
                // .000+ case
                else if (g2 === '+') {
                    result.minimumFractionDigits = g2.length;
                }
                // .### case
                else if (g1[0] === '#') {
                    result.maximumFractionDigits = g1.length;
                }
                // .00## or .000 case
                else {
                    result.minimumFractionDigits = g1.length;
                    result.maximumFractionDigits =
                        g1.length + (typeof g2 === 'string' ? g2.length : 0);
                }
                return '';
            });
            if (token.options.length) {
                result = __assign$1(__assign$1({}, result), parseSignificantPrecision(token.options[0]));
            }
            continue;
        }
        if (SIGNIFICANT_PRECISION_REGEX.test(token.stem)) {
            result = __assign$1(__assign$1({}, result), parseSignificantPrecision(token.stem));
            continue;
        }
        var signOpts = parseSign(token.stem);
        if (signOpts) {
            result = __assign$1(__assign$1({}, result), signOpts);
        }
    }
    return result;
}

function parse(input, opts) {
    var els = pegParse(input, opts);
    if (!opts || opts.normalizeHashtagInPlural !== false) {
        normalizeHashtagInPlural(els);
    }
    return els;
}

/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/
var __spreadArrays$1 = (undefined && undefined.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
// -- Utilities ----------------------------------------------------------------
function getCacheId(inputs) {
    return JSON.stringify(inputs.map(function (input) {
        return input && typeof input === 'object' ? orderedProps(input) : input;
    }));
}
function orderedProps(obj) {
    return Object.keys(obj)
        .sort()
        .map(function (k) {
        var _a;
        return (_a = {}, _a[k] = obj[k], _a);
    });
}
var memoizeFormatConstructor = function (FormatConstructor, cache) {
    if (cache === void 0) { cache = {}; }
    return function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var cacheId = getCacheId(args);
        var format = cacheId && cache[cacheId];
        if (!format) {
            format = new ((_a = FormatConstructor).bind.apply(_a, __spreadArrays$1([void 0], args)))();
            if (cacheId) {
                cache[cacheId] = format;
            }
        }
        return format;
    };
};
//# sourceMappingURL=index.js.map

var __extends$1 = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArrays$2 = (undefined && undefined.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var FormatError = /** @class */ (function (_super) {
    __extends$1(FormatError, _super);
    function FormatError(msg, variableId) {
        var _this = _super.call(this, msg) || this;
        _this.variableId = variableId;
        return _this;
    }
    return FormatError;
}(Error));
function mergeLiteral(parts) {
    if (parts.length < 2) {
        return parts;
    }
    return parts.reduce(function (all, part) {
        var lastPart = all[all.length - 1];
        if (!lastPart ||
            lastPart.type !== 0 /* literal */ ||
            part.type !== 0 /* literal */) {
            all.push(part);
        }
        else {
            lastPart.value += part.value;
        }
        return all;
    }, []);
}
// TODO(skeleton): add skeleton support
function formatToParts(els, locales, formatters, formats, values, currentPluralValue, 
// For debugging
originalMessage) {
    // Hot path for straight simple msg translations
    if (els.length === 1 && isLiteralElement(els[0])) {
        return [
            {
                type: 0 /* literal */,
                value: els[0].value,
            },
        ];
    }
    var result = [];
    for (var _i = 0, els_1 = els; _i < els_1.length; _i++) {
        var el = els_1[_i];
        // Exit early for string parts.
        if (isLiteralElement(el)) {
            result.push({
                type: 0 /* literal */,
                value: el.value,
            });
            continue;
        }
        // TODO: should this part be literal type?
        // Replace `#` in plural rules with the actual numeric value.
        if (isPoundElement(el)) {
            if (typeof currentPluralValue === 'number') {
                result.push({
                    type: 0 /* literal */,
                    value: formatters.getNumberFormat(locales).format(currentPluralValue),
                });
            }
            continue;
        }
        var varName = el.value;
        // Enforce that all required values are provided by the caller.
        if (!(values && varName in values)) {
            throw new FormatError("The intl string context variable \"" + varName + "\" was not provided to the string \"" + originalMessage + "\"");
        }
        var value = values[varName];
        if (isArgumentElement(el)) {
            if (!value || typeof value === 'string' || typeof value === 'number') {
                value =
                    typeof value === 'string' || typeof value === 'number'
                        ? String(value)
                        : '';
            }
            result.push({
                type: 1 /* argument */,
                value: value,
            });
            continue;
        }
        // Recursively format plural and select parts' option — which can be a
        // nested pattern structure. The choosing of the option to use is
        // abstracted-by and delegated-to the part helper object.
        if (isDateElement(el)) {
            var style = typeof el.style === 'string' ? formats.date[el.style] : undefined;
            result.push({
                type: 0 /* literal */,
                value: formatters
                    .getDateTimeFormat(locales, style)
                    .format(value),
            });
            continue;
        }
        if (isTimeElement(el)) {
            var style = typeof el.style === 'string'
                ? formats.time[el.style]
                : isDateTimeSkeleton(el.style)
                    ? parseDateTimeSkeleton(el.style.pattern)
                    : undefined;
            result.push({
                type: 0 /* literal */,
                value: formatters
                    .getDateTimeFormat(locales, style)
                    .format(value),
            });
            continue;
        }
        if (isNumberElement(el)) {
            var style = typeof el.style === 'string'
                ? formats.number[el.style]
                : isNumberSkeleton(el.style)
                    ? convertNumberSkeletonToNumberFormatOptions(el.style.tokens)
                    : undefined;
            result.push({
                type: 0 /* literal */,
                value: formatters
                    .getNumberFormat(locales, style)
                    .format(value),
            });
            continue;
        }
        if (isSelectElement(el)) {
            var opt = el.options[value] || el.options.other;
            if (!opt) {
                throw new RangeError("Invalid values for \"" + el.value + "\": \"" + value + "\". Options are \"" + Object.keys(el.options).join('", "') + "\"");
            }
            result.push.apply(result, formatToParts(opt.value, locales, formatters, formats, values));
            continue;
        }
        if (isPluralElement(el)) {
            var opt = el.options["=" + value];
            if (!opt) {
                if (!Intl.PluralRules) {
                    throw new FormatError("Intl.PluralRules is not available in this environment.\nTry polyfilling it using \"@formatjs/intl-pluralrules\"\n");
                }
                var rule = formatters
                    .getPluralRules(locales, { type: el.pluralType })
                    .select(value - (el.offset || 0));
                opt = el.options[rule] || el.options.other;
            }
            if (!opt) {
                throw new RangeError("Invalid values for \"" + el.value + "\": \"" + value + "\". Options are \"" + Object.keys(el.options).join('", "') + "\"");
            }
            result.push.apply(result, formatToParts(opt.value, locales, formatters, formats, values, value - (el.offset || 0)));
            continue;
        }
    }
    return mergeLiteral(result);
}
function formatToString(els, locales, formatters, formats, values, 
// For debugging
originalMessage) {
    var parts = formatToParts(els, locales, formatters, formats, values, undefined, originalMessage);
    // Hot path for straight simple msg translations
    if (parts.length === 1) {
        return parts[0].value;
    }
    return parts.reduce(function (all, part) { return (all += part.value); }, '');
}
// Singleton
var domParser;
var TOKEN_DELIMITER = '@@';
var TOKEN_REGEX = /@@(\d+_\d+)@@/g;
var counter = 0;
function generateId() {
    return Date.now() + "_" + ++counter;
}
function restoreRichPlaceholderMessage(text, objectParts) {
    return text
        .split(TOKEN_REGEX)
        .filter(Boolean)
        .map(function (c) { return (objectParts[c] != null ? objectParts[c] : c); })
        .reduce(function (all, c) {
        if (!all.length) {
            all.push(c);
        }
        else if (typeof c === 'string' &&
            typeof all[all.length - 1] === 'string') {
            all[all.length - 1] += c;
        }
        else {
            all.push(c);
        }
        return all;
    }, []);
}
/**
 * Not exhaustive, just for sanity check
 */
var SIMPLE_XML_REGEX = /(<([0-9a-zA-Z-_]*?)>(.*?)<\/([0-9a-zA-Z-_]*?)>)|(<[0-9a-zA-Z-_]*?\/>)/;
var TEMPLATE_ID = Date.now() + '@@';
var VOID_ELEMENTS = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
];
function formatHTMLElement(el, objectParts, values) {
    var tagName = el.tagName;
    var outerHTML = el.outerHTML, textContent = el.textContent, childNodes = el.childNodes;
    // Regular text
    if (!tagName) {
        return restoreRichPlaceholderMessage(textContent || '', objectParts);
    }
    tagName = tagName.toLowerCase();
    var isVoidElement = ~VOID_ELEMENTS.indexOf(tagName);
    var formatFnOrValue = values[tagName];
    if (formatFnOrValue && isVoidElement) {
        throw new FormatError(tagName + " is a self-closing tag and can not be used, please use another tag name.");
    }
    if (!childNodes.length) {
        return [outerHTML];
    }
    var chunks = Array.prototype.slice.call(childNodes).reduce(function (all, child) {
        return all.concat(formatHTMLElement(child, objectParts, values));
    }, []);
    // Legacy HTML
    if (!formatFnOrValue) {
        return __spreadArrays$2(["<" + tagName + ">"], chunks, ["</" + tagName + ">"]);
    }
    // HTML Tag replacement
    if (typeof formatFnOrValue === 'function') {
        return [formatFnOrValue.apply(void 0, chunks)];
    }
    return [formatFnOrValue];
}
function formatHTMLMessage(els, locales, formatters, formats, values, 
// For debugging
originalMessage) {
    var parts = formatToParts(els, locales, formatters, formats, values, undefined, originalMessage);
    var objectParts = {};
    var formattedMessage = parts.reduce(function (all, part) {
        if (part.type === 0 /* literal */) {
            return (all += part.value);
        }
        var id = generateId();
        objectParts[id] = part.value;
        return (all += "" + TOKEN_DELIMITER + id + TOKEN_DELIMITER);
    }, '');
    // Not designed to filter out aggressively
    if (!SIMPLE_XML_REGEX.test(formattedMessage)) {
        return restoreRichPlaceholderMessage(formattedMessage, objectParts);
    }
    if (!values) {
        throw new FormatError('Message has placeholders but no values was given');
    }
    if (typeof DOMParser === 'undefined') {
        throw new FormatError('Cannot format XML message without DOMParser');
    }
    if (!domParser) {
        domParser = new DOMParser();
    }
    var content = domParser
        .parseFromString("<formatted-message id=\"" + TEMPLATE_ID + "\">" + formattedMessage + "</formatted-message>", 'text/html')
        .getElementById(TEMPLATE_ID);
    if (!content) {
        throw new FormatError("Malformed HTML message " + formattedMessage);
    }
    var tagsToFormat = Object.keys(values).filter(function (varName) { return !!content.getElementsByTagName(varName).length; });
    // No tags to format
    if (!tagsToFormat.length) {
        return restoreRichPlaceholderMessage(formattedMessage, objectParts);
    }
    var caseSensitiveTags = tagsToFormat.filter(function (tagName) { return tagName !== tagName.toLowerCase(); });
    if (caseSensitiveTags.length) {
        throw new FormatError("HTML tag must be lowercased but the following tags are not: " + caseSensitiveTags.join(', '));
    }
    // We're doing this since top node is `<formatted-message/>` which does not have a formatter
    return Array.prototype.slice
        .call(content.childNodes)
        .reduce(function (all, child) { return all.concat(formatHTMLElement(child, objectParts, values)); }, []);
}

/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/
var __assign$2 = (undefined && undefined.__assign) || function () {
    __assign$2 = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign$2.apply(this, arguments);
};
// -- MessageFormat --------------------------------------------------------
function mergeConfig(c1, c2) {
    if (!c2) {
        return c1;
    }
    return __assign$2(__assign$2(__assign$2({}, (c1 || {})), (c2 || {})), Object.keys(c1).reduce(function (all, k) {
        all[k] = __assign$2(__assign$2({}, c1[k]), (c2[k] || {}));
        return all;
    }, {}));
}
function mergeConfigs(defaultConfig, configs) {
    if (!configs) {
        return defaultConfig;
    }
    return Object.keys(defaultConfig).reduce(function (all, k) {
        all[k] = mergeConfig(defaultConfig[k], configs[k]);
        return all;
    }, __assign$2({}, defaultConfig));
}
function createDefaultFormatters(cache) {
    if (cache === void 0) { cache = {
        number: {},
        dateTime: {},
        pluralRules: {},
    }; }
    return {
        getNumberFormat: memoizeFormatConstructor(Intl.NumberFormat, cache.number),
        getDateTimeFormat: memoizeFormatConstructor(Intl.DateTimeFormat, cache.dateTime),
        getPluralRules: memoizeFormatConstructor(Intl.PluralRules, cache.pluralRules),
    };
}
var IntlMessageFormat = /** @class */ (function () {
    function IntlMessageFormat(message, locales, overrideFormats, opts) {
        var _this = this;
        if (locales === void 0) { locales = IntlMessageFormat.defaultLocale; }
        this.formatterCache = {
            number: {},
            dateTime: {},
            pluralRules: {},
        };
        this.format = function (values) {
            return formatToString(_this.ast, _this.locales, _this.formatters, _this.formats, values, _this.message);
        };
        this.formatToParts = function (values) {
            return formatToParts(_this.ast, _this.locales, _this.formatters, _this.formats, values, undefined, _this.message);
        };
        this.formatHTMLMessage = function (values) {
            return formatHTMLMessage(_this.ast, _this.locales, _this.formatters, _this.formats, values, _this.message);
        };
        this.resolvedOptions = function () { return ({
            locale: Intl.NumberFormat.supportedLocalesOf(_this.locales)[0],
        }); };
        this.getAst = function () { return _this.ast; };
        if (typeof message === 'string') {
            this.message = message;
            if (!IntlMessageFormat.__parse) {
                throw new TypeError('IntlMessageFormat.__parse must be set to process `message` of type `string`');
            }
            // Parse string messages into an AST.
            this.ast = IntlMessageFormat.__parse(message, {
                normalizeHashtagInPlural: false,
            });
        }
        else {
            this.ast = message;
        }
        if (!Array.isArray(this.ast)) {
            throw new TypeError('A message must be provided as a String or AST.');
        }
        // Creates a new object with the specified `formats` merged with the default
        // formats.
        this.formats = mergeConfigs(IntlMessageFormat.formats, overrideFormats);
        // Defined first because it's used to build the format pattern.
        this.locales = locales;
        this.formatters =
            (opts && opts.formatters) || createDefaultFormatters(this.formatterCache);
    }
    IntlMessageFormat.defaultLocale = new Intl.NumberFormat().resolvedOptions().locale;
    IntlMessageFormat.__parse = parse;
    // Default format options used as the prototype of the `formats` provided to the
    // constructor. These are used when constructing the internal Intl.NumberFormat
    // and Intl.DateTimeFormat instances.
    IntlMessageFormat.formats = {
        number: {
            currency: {
                style: 'currency',
            },
            percent: {
                style: 'percent',
            },
        },
        date: {
            short: {
                month: 'numeric',
                day: 'numeric',
                year: '2-digit',
            },
            medium: {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            },
            long: {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            },
            full: {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            },
        },
        time: {
            short: {
                hour: 'numeric',
                minute: 'numeric',
            },
            medium: {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
            },
            long: {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                timeZoneName: 'short',
            },
            full: {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                timeZoneName: 'short',
            },
        },
    };
    return IntlMessageFormat;
}());

/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

const o=(n,e="")=>{const t={};for(const r in n){const i=e+r;"object"==typeof n[r]?Object.assign(t,o(n[r],`${i}.`)):t[i]=n[r];}return t};let r;const i=writable({});function a(n){return n in r}function l(n,e){if(a(n)){const t=function(n){return r[n]||null}(n);if(e in t)return t[e]}return null}function s(n,...e){const t=e.map(n=>o(n));i.update(e=>(e[n]=Object.assign(e[n]||{},...t),e));}const c=derived([i],([n])=>Object.keys(n));i.subscribe(n=>r=n);const u={};function m(n){return u[n]}function f(n){return E(n).reverse().some(m)}const d={};function w(n){if(!f(n))return;if(n in d)return d[n];const e=function(n){return E(n).reverse().map(n=>{const e=m(n);return [n,e?[...e]:[]]}).filter(([,n])=>n.length>0)}(n);return 0!==e.length?(d[n]=Promise.all(e.map(([n,e])=>Promise.all(e.map(n=>n())).then(e=>{!function(n){delete u[n];}(n),e=e.map(n=>n.default||n),s(n,...e);}))).then(()=>{delete d[n];}),d[n]):void 0}function g(n,e){m(n)||function(n){u[n]=new Set;}(n);const t=m(n);m(n).has(e)||(a(n)||i.update(e=>(e[n]={},e)),t.add(e));}
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */function p(n,e){var t={};for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&e.indexOf(o)<0&&(t[o]=n[o]);if(null!=n&&"function"==typeof Object.getOwnPropertySymbols){var r=0;for(o=Object.getOwnPropertySymbols(n);r<o.length;r++)e.indexOf(o[r])<0&&Object.prototype.propertyIsEnumerable.call(n,o[r])&&(t[o[r]]=n[o[r]]);}return t}const b={fallbackLocale:null,initialLocale:null,loadingDelay:200,formats:{number:{scientific:{notation:"scientific"},engineering:{notation:"engineering"},compactLong:{notation:"compact",compactDisplay:"long"},compactShort:{notation:"compact",compactDisplay:"short"}},date:{short:{month:"numeric",day:"numeric",year:"2-digit"},medium:{month:"short",day:"numeric",year:"numeric"},long:{month:"long",day:"numeric",year:"numeric"},full:{weekday:"long",month:"long",day:"numeric",year:"numeric"}},time:{short:{hour:"numeric",minute:"numeric"},medium:{hour:"numeric",minute:"numeric",second:"numeric"},long:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"},full:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"}}},warnOnMissingMessages:!0};function h(){return b}function y(n){const{formats:e}=n,t=p(n,["formats"]),o=n.initialLocale||n.fallbackLocale;return Object.assign(b,t,{initialLocale:o}),e&&("number"in e&&Object.assign(b.formats.number,e.number),"date"in e&&Object.assign(b.formats.date,e.date),"time"in e&&Object.assign(b.formats.time,e.time)),j.set(o)}const O=writable(!1);let v;const j=writable(null);function L(n,e){return 0===e.indexOf(n)&&n!==e}function k(n,e){return n===e||L(n,e)||L(e,n)}function x(n){const e=n.lastIndexOf("-");if(e>0)return n.slice(0,e);const{fallbackLocale:t}=h();return t&&!k(n,t)?t:null}function E(n){const e=n.split("-").map((n,e,t)=>t.slice(0,e+1).join("-")),{fallbackLocale:t}=h();return t&&!k(n,t)?e.concat(E(t)):e}function $(){return v}j.subscribe(n=>{v=n,"undefined"!=typeof window&&document.documentElement.setAttribute("lang",n);});const D=j.set;j.set=n=>{if(function n(e){return null==e||a(e)?e:n(x(e))}(n)&&f(n)){const e=h().loadingDelay;let t;return "undefined"!=typeof window&&null!=$()&&e?t=window.setTimeout(()=>O.set(!0),e):O.set(!0),w(n).then(()=>{D(n);}).finally(()=>{clearTimeout(t),O.set(!1);})}return D(n)},j.update=n=>D(n(v));const T=()=>"undefined"==typeof window?null:window.navigator.language||window.navigator.languages[0],F={},Z=(n,e)=>{if(null==e)return null;const t=l(e,n);return t||Z(n,x(e))},C=(n,e)=>{if(e in F&&n in F[e])return F[e][n];const t=Z(n,e);return t?((n,e,t)=>t?(e in F||(F[e]={}),n in F[e]||(F[e][n]=t),t):t)(n,e,t):null},J=n=>{const e=Object.create(null);return t=>{const o=JSON.stringify(t);return o in e?e[o]:e[o]=n(t)}},U=(n,e)=>{const t=h().formats;if(n in t&&e in t[n])return t[n][e];throw new Error(`[svelte-i18n] Unknown "${e}" ${n} format.`)},_=J(n=>{var{locale:e,format:t}=n,o=p(n,["locale","format"]);if(null==e)throw new Error('[svelte-i18n] A "locale" must be set to format numbers');return t&&(o=U("number",t)),new Intl.NumberFormat(e,o)}),q=J(n=>{var{locale:e,format:t}=n,o=p(n,["locale","format"]);if(null==e)throw new Error('[svelte-i18n] A "locale" must be set to format dates');return t?o=U("date",t):0===Object.keys(o).length&&(o=U("date","short")),new Intl.DateTimeFormat(e,o)}),z=J(n=>{var{locale:e,format:t}=n,o=p(n,["locale","format"]);if(null==e)throw new Error('[svelte-i18n] A "locale" must be set to format time values');return t?o=U("time",t):0===Object.keys(o).length&&(o=U("time","short")),new Intl.DateTimeFormat(e,o)}),B=(n={})=>{var{locale:e=$()}=n,t=p(n,["locale"]);return _(Object.assign({locale:e},t))},G=(n={})=>{var{locale:e=$()}=n,t=p(n,["locale"]);return q(Object.assign({locale:e},t))},H=(n={})=>{var{locale:e=$()}=n,t=p(n,["locale"]);return z(Object.assign({locale:e},t))},K=J((n,e=$())=>new IntlMessageFormat(n,e,h().formats)),Q=(n,e={})=>{"object"==typeof n&&(n=(e=n).id);const{values:t,locale:o=$(),default:r}=e;if(null==o)throw new Error("[svelte-i18n] Cannot format a message without first setting the initial locale.");const i=C(n,o);return i?t?K(i,o).format(t):i:(h().warnOnMissingMessages&&console.warn(`[svelte-i18n] The message "${n}" was not found in "${E(o).join('", "')}".${f($())?"\n\nNote: there are at least one loader still registered to this locale that wasn't executed.":""}`),r||n)},R=(n,e)=>H(e).format(n),V=(n,e)=>G(e).format(n),W=(n,e)=>B(e).format(n),X=derived([j,i],()=>Q),Y=derived([j],()=>R),nn=derived([j],()=>V),en=derived([j],()=>W);

g('en', () => import('./en.4d4cdcf0.js'));

y({
  fallbackLocale: 'en',
  initialLocale: T(),
});

start({
	target: document.querySelector('#sapper')
});

export { SvelteComponentDev as S, validate_slots as a, children as b, claim_element as c, dispatch_dev as d, element as e, claim_text as f, detach_dev as g, attr_dev as h, init as i, add_location as j, insert_dev as k, append_dev as l, space as m, noop as n, claim_space as o, set_style as p, svg_element as q, query_selector_all as r, safe_not_equal as s, text as t, destroy_each as u, validate_each_argument as v };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LjZhZmQyYzRkLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi9ub2RlX21vZHVsZXMvc3ZlbHRlL2ludGVybmFsL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9zdmVsdGUvc3RvcmUvaW5kZXgubWpzIiwiLi4vLi4vLi4vc3JjL25vZGVfbW9kdWxlcy9Ac2FwcGVyL2ludGVybmFsL3NoYXJlZC5tanMiLCIuLi8uLi8uLi9zcmMvbm9kZV9tb2R1bGVzL0BzYXBwZXIvaW50ZXJuYWwvZXJyb3Iuc3ZlbHRlIiwiLi4vLi4vLi4vc3JjL25vZGVfbW9kdWxlcy9Ac2FwcGVyL2ludGVybmFsL0FwcC5zdmVsdGUiLCIuLi8uLi8uLi9zcmMvbm9kZV9tb2R1bGVzL0BzYXBwZXIvaW50ZXJuYWwvbWFuaWZlc3QtY2xpZW50Lm1qcyIsIi4uLy4uLy4uL3NyYy9ub2RlX21vZHVsZXMvQHNhcHBlci9hcHAubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2ludGwtbWVzc2FnZWZvcm1hdC1wYXJzZXIvbGliL3R5cGVzLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2ludGwtbWVzc2FnZWZvcm1hdC1wYXJzZXIvbGliL3BhcnNlci5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9pbnRsLW1lc3NhZ2Vmb3JtYXQtcGFyc2VyL2xpYi9ub3JtYWxpemUuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvaW50bC1tZXNzYWdlZm9ybWF0LXBhcnNlci9saWIvc2tlbGV0b24uanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvaW50bC1tZXNzYWdlZm9ybWF0LXBhcnNlci9saWIvaW5kZXguanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvaW50bC1mb3JtYXQtY2FjaGUvbGliL2luZGV4LmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2ludGwtbWVzc2FnZWZvcm1hdC9saWIvZm9ybWF0dGVycy5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9pbnRsLW1lc3NhZ2Vmb3JtYXQvbGliL2NvcmUuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvaW50bC1tZXNzYWdlZm9ybWF0L2xpYi9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9zdmVsdGUtaTE4bi9kaXN0L3J1bnRpbWUuZXNtLmpzIiwiLi4vLi4vLi4vc3JjL2kxOG4uanMiLCIuLi8uLi8uLi9zcmMvY2xpZW50LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIG5vb3AoKSB7IH1cbmNvbnN0IGlkZW50aXR5ID0geCA9PiB4O1xuZnVuY3Rpb24gYXNzaWduKHRhciwgc3JjKSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGZvciAoY29uc3QgayBpbiBzcmMpXG4gICAgICAgIHRhcltrXSA9IHNyY1trXTtcbiAgICByZXR1cm4gdGFyO1xufVxuZnVuY3Rpb24gaXNfcHJvbWlzZSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHR5cGVvZiB2YWx1ZS50aGVuID09PSAnZnVuY3Rpb24nO1xufVxuZnVuY3Rpb24gYWRkX2xvY2F0aW9uKGVsZW1lbnQsIGZpbGUsIGxpbmUsIGNvbHVtbiwgY2hhcikge1xuICAgIGVsZW1lbnQuX19zdmVsdGVfbWV0YSA9IHtcbiAgICAgICAgbG9jOiB7IGZpbGUsIGxpbmUsIGNvbHVtbiwgY2hhciB9XG4gICAgfTtcbn1cbmZ1bmN0aW9uIHJ1bihmbikge1xuICAgIHJldHVybiBmbigpO1xufVxuZnVuY3Rpb24gYmxhbmtfb2JqZWN0KCkge1xuICAgIHJldHVybiBPYmplY3QuY3JlYXRlKG51bGwpO1xufVxuZnVuY3Rpb24gcnVuX2FsbChmbnMpIHtcbiAgICBmbnMuZm9yRWFjaChydW4pO1xufVxuZnVuY3Rpb24gaXNfZnVuY3Rpb24odGhpbmcpIHtcbiAgICByZXR1cm4gdHlwZW9mIHRoaW5nID09PSAnZnVuY3Rpb24nO1xufVxuZnVuY3Rpb24gc2FmZV9ub3RfZXF1YWwoYSwgYikge1xuICAgIHJldHVybiBhICE9IGEgPyBiID09IGIgOiBhICE9PSBiIHx8ICgoYSAmJiB0eXBlb2YgYSA9PT0gJ29iamVjdCcpIHx8IHR5cGVvZiBhID09PSAnZnVuY3Rpb24nKTtcbn1cbmZ1bmN0aW9uIG5vdF9lcXVhbChhLCBiKSB7XG4gICAgcmV0dXJuIGEgIT0gYSA/IGIgPT0gYiA6IGEgIT09IGI7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZV9zdG9yZShzdG9yZSwgbmFtZSkge1xuICAgIGlmIChzdG9yZSAhPSBudWxsICYmIHR5cGVvZiBzdG9yZS5zdWJzY3JpYmUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAnJHtuYW1lfScgaXMgbm90IGEgc3RvcmUgd2l0aCBhICdzdWJzY3JpYmUnIG1ldGhvZGApO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHN1YnNjcmliZShzdG9yZSwgLi4uY2FsbGJhY2tzKSB7XG4gICAgaWYgKHN0b3JlID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG5vb3A7XG4gICAgfVxuICAgIGNvbnN0IHVuc3ViID0gc3RvcmUuc3Vic2NyaWJlKC4uLmNhbGxiYWNrcyk7XG4gICAgcmV0dXJuIHVuc3ViLnVuc3Vic2NyaWJlID8gKCkgPT4gdW5zdWIudW5zdWJzY3JpYmUoKSA6IHVuc3ViO1xufVxuZnVuY3Rpb24gZ2V0X3N0b3JlX3ZhbHVlKHN0b3JlKSB7XG4gICAgbGV0IHZhbHVlO1xuICAgIHN1YnNjcmliZShzdG9yZSwgXyA9PiB2YWx1ZSA9IF8pKCk7XG4gICAgcmV0dXJuIHZhbHVlO1xufVxuZnVuY3Rpb24gY29tcG9uZW50X3N1YnNjcmliZShjb21wb25lbnQsIHN0b3JlLCBjYWxsYmFjaykge1xuICAgIGNvbXBvbmVudC4kJC5vbl9kZXN0cm95LnB1c2goc3Vic2NyaWJlKHN0b3JlLCBjYWxsYmFjaykpO1xufVxuZnVuY3Rpb24gY3JlYXRlX3Nsb3QoZGVmaW5pdGlvbiwgY3R4LCAkJHNjb3BlLCBmbikge1xuICAgIGlmIChkZWZpbml0aW9uKSB7XG4gICAgICAgIGNvbnN0IHNsb3RfY3R4ID0gZ2V0X3Nsb3RfY29udGV4dChkZWZpbml0aW9uLCBjdHgsICQkc2NvcGUsIGZuKTtcbiAgICAgICAgcmV0dXJuIGRlZmluaXRpb25bMF0oc2xvdF9jdHgpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGdldF9zbG90X2NvbnRleHQoZGVmaW5pdGlvbiwgY3R4LCAkJHNjb3BlLCBmbikge1xuICAgIHJldHVybiBkZWZpbml0aW9uWzFdICYmIGZuXG4gICAgICAgID8gYXNzaWduKCQkc2NvcGUuY3R4LnNsaWNlKCksIGRlZmluaXRpb25bMV0oZm4oY3R4KSkpXG4gICAgICAgIDogJCRzY29wZS5jdHg7XG59XG5mdW5jdGlvbiBnZXRfc2xvdF9jaGFuZ2VzKGRlZmluaXRpb24sICQkc2NvcGUsIGRpcnR5LCBmbikge1xuICAgIGlmIChkZWZpbml0aW9uWzJdICYmIGZuKSB7XG4gICAgICAgIGNvbnN0IGxldHMgPSBkZWZpbml0aW9uWzJdKGZuKGRpcnR5KSk7XG4gICAgICAgIGlmICgkJHNjb3BlLmRpcnR5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBsZXRzO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgbGV0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lcmdlZCA9IFtdO1xuICAgICAgICAgICAgY29uc3QgbGVuID0gTWF0aC5tYXgoJCRzY29wZS5kaXJ0eS5sZW5ndGgsIGxldHMubGVuZ3RoKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICBtZXJnZWRbaV0gPSAkJHNjb3BlLmRpcnR5W2ldIHwgbGV0c1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtZXJnZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQkc2NvcGUuZGlydHkgfCBsZXRzO1xuICAgIH1cbiAgICByZXR1cm4gJCRzY29wZS5kaXJ0eTtcbn1cbmZ1bmN0aW9uIGV4Y2x1ZGVfaW50ZXJuYWxfcHJvcHMocHJvcHMpIHtcbiAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGsgaW4gcHJvcHMpXG4gICAgICAgIGlmIChrWzBdICE9PSAnJCcpXG4gICAgICAgICAgICByZXN1bHRba10gPSBwcm9wc1trXTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gY29tcHV0ZV9yZXN0X3Byb3BzKHByb3BzLCBrZXlzKSB7XG4gICAgY29uc3QgcmVzdCA9IHt9O1xuICAgIGtleXMgPSBuZXcgU2V0KGtleXMpO1xuICAgIGZvciAoY29uc3QgayBpbiBwcm9wcylcbiAgICAgICAgaWYgKCFrZXlzLmhhcyhrKSAmJiBrWzBdICE9PSAnJCcpXG4gICAgICAgICAgICByZXN0W2tdID0gcHJvcHNba107XG4gICAgcmV0dXJuIHJlc3Q7XG59XG5mdW5jdGlvbiBvbmNlKGZuKSB7XG4gICAgbGV0IHJhbiA9IGZhbHNlO1xuICAgIHJldHVybiBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICBpZiAocmFuKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICByYW4gPSB0cnVlO1xuICAgICAgICBmbi5jYWxsKHRoaXMsIC4uLmFyZ3MpO1xuICAgIH07XG59XG5mdW5jdGlvbiBudWxsX3RvX2VtcHR5KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09IG51bGwgPyAnJyA6IHZhbHVlO1xufVxuZnVuY3Rpb24gc2V0X3N0b3JlX3ZhbHVlKHN0b3JlLCByZXQsIHZhbHVlID0gcmV0KSB7XG4gICAgc3RvcmUuc2V0KHZhbHVlKTtcbiAgICByZXR1cm4gcmV0O1xufVxuY29uc3QgaGFzX3Byb3AgPSAob2JqLCBwcm9wKSA9PiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbmZ1bmN0aW9uIGFjdGlvbl9kZXN0cm95ZXIoYWN0aW9uX3Jlc3VsdCkge1xuICAgIHJldHVybiBhY3Rpb25fcmVzdWx0ICYmIGlzX2Z1bmN0aW9uKGFjdGlvbl9yZXN1bHQuZGVzdHJveSkgPyBhY3Rpb25fcmVzdWx0LmRlc3Ryb3kgOiBub29wO1xufVxuXG5jb25zdCBpc19jbGllbnQgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJztcbmxldCBub3cgPSBpc19jbGllbnRcbiAgICA/ICgpID0+IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKVxuICAgIDogKCkgPT4gRGF0ZS5ub3coKTtcbmxldCByYWYgPSBpc19jbGllbnQgPyBjYiA9PiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2IpIDogbm9vcDtcbi8vIHVzZWQgaW50ZXJuYWxseSBmb3IgdGVzdGluZ1xuZnVuY3Rpb24gc2V0X25vdyhmbikge1xuICAgIG5vdyA9IGZuO1xufVxuZnVuY3Rpb24gc2V0X3JhZihmbikge1xuICAgIHJhZiA9IGZuO1xufVxuXG5jb25zdCB0YXNrcyA9IG5ldyBTZXQoKTtcbmZ1bmN0aW9uIHJ1bl90YXNrcyhub3cpIHtcbiAgICB0YXNrcy5mb3JFYWNoKHRhc2sgPT4ge1xuICAgICAgICBpZiAoIXRhc2suYyhub3cpKSB7XG4gICAgICAgICAgICB0YXNrcy5kZWxldGUodGFzayk7XG4gICAgICAgICAgICB0YXNrLmYoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh0YXNrcy5zaXplICE9PSAwKVxuICAgICAgICByYWYocnVuX3Rhc2tzKTtcbn1cbi8qKlxuICogRm9yIHRlc3RpbmcgcHVycG9zZXMgb25seSFcbiAqL1xuZnVuY3Rpb24gY2xlYXJfbG9vcHMoKSB7XG4gICAgdGFza3MuY2xlYXIoKTtcbn1cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyB0YXNrIHRoYXQgcnVucyBvbiBlYWNoIHJhZiBmcmFtZVxuICogdW50aWwgaXQgcmV0dXJucyBhIGZhbHN5IHZhbHVlIG9yIGlzIGFib3J0ZWRcbiAqL1xuZnVuY3Rpb24gbG9vcChjYWxsYmFjaykge1xuICAgIGxldCB0YXNrO1xuICAgIGlmICh0YXNrcy5zaXplID09PSAwKVxuICAgICAgICByYWYocnVuX3Rhc2tzKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBwcm9taXNlOiBuZXcgUHJvbWlzZShmdWxmaWxsID0+IHtcbiAgICAgICAgICAgIHRhc2tzLmFkZCh0YXNrID0geyBjOiBjYWxsYmFjaywgZjogZnVsZmlsbCB9KTtcbiAgICAgICAgfSksXG4gICAgICAgIGFib3J0KCkge1xuICAgICAgICAgICAgdGFza3MuZGVsZXRlKHRhc2spO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kKHRhcmdldCwgbm9kZSkge1xuICAgIHRhcmdldC5hcHBlbmRDaGlsZChub2RlKTtcbn1cbmZ1bmN0aW9uIGluc2VydCh0YXJnZXQsIG5vZGUsIGFuY2hvcikge1xuICAgIHRhcmdldC5pbnNlcnRCZWZvcmUobm9kZSwgYW5jaG9yIHx8IG51bGwpO1xufVxuZnVuY3Rpb24gZGV0YWNoKG5vZGUpIHtcbiAgICBub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG59XG5mdW5jdGlvbiBkZXN0cm95X2VhY2goaXRlcmF0aW9ucywgZGV0YWNoaW5nKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVyYXRpb25zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGlmIChpdGVyYXRpb25zW2ldKVxuICAgICAgICAgICAgaXRlcmF0aW9uc1tpXS5kKGRldGFjaGluZyk7XG4gICAgfVxufVxuZnVuY3Rpb24gZWxlbWVudChuYW1lKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobmFtZSk7XG59XG5mdW5jdGlvbiBlbGVtZW50X2lzKG5hbWUsIGlzKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobmFtZSwgeyBpcyB9KTtcbn1cbmZ1bmN0aW9uIG9iamVjdF93aXRob3V0X3Byb3BlcnRpZXMob2JqLCBleGNsdWRlKSB7XG4gICAgY29uc3QgdGFyZ2V0ID0ge307XG4gICAgZm9yIChjb25zdCBrIGluIG9iaikge1xuICAgICAgICBpZiAoaGFzX3Byb3Aob2JqLCBrKVxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgJiYgZXhjbHVkZS5pbmRleE9mKGspID09PSAtMSkge1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgdGFyZ2V0W2tdID0gb2JqW2tdO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5mdW5jdGlvbiBzdmdfZWxlbWVudChuYW1lKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCBuYW1lKTtcbn1cbmZ1bmN0aW9uIHRleHQoZGF0YSkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShkYXRhKTtcbn1cbmZ1bmN0aW9uIHNwYWNlKCkge1xuICAgIHJldHVybiB0ZXh0KCcgJyk7XG59XG5mdW5jdGlvbiBlbXB0eSgpIHtcbiAgICByZXR1cm4gdGV4dCgnJyk7XG59XG5mdW5jdGlvbiBsaXN0ZW4obm9kZSwgZXZlbnQsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIHJldHVybiAoKSA9PiBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGhhbmRsZXIsIG9wdGlvbnMpO1xufVxuZnVuY3Rpb24gcHJldmVudF9kZWZhdWx0KGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIHJldHVybiBmbi5jYWxsKHRoaXMsIGV2ZW50KTtcbiAgICB9O1xufVxuZnVuY3Rpb24gc3RvcF9wcm9wYWdhdGlvbihmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgcmV0dXJuIGZuLmNhbGwodGhpcywgZXZlbnQpO1xuICAgIH07XG59XG5mdW5jdGlvbiBzZWxmKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIGlmIChldmVudC50YXJnZXQgPT09IHRoaXMpXG4gICAgICAgICAgICBmbi5jYWxsKHRoaXMsIGV2ZW50KTtcbiAgICB9O1xufVxuZnVuY3Rpb24gYXR0cihub2RlLCBhdHRyaWJ1dGUsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpXG4gICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gICAgZWxzZSBpZiAobm9kZS5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlKSAhPT0gdmFsdWUpXG4gICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZSwgdmFsdWUpO1xufVxuZnVuY3Rpb24gc2V0X2F0dHJpYnV0ZXMobm9kZSwgYXR0cmlidXRlcykge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBjb25zdCBkZXNjcmlwdG9ycyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG5vZGUuX19wcm90b19fKTtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzW2tleV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChrZXkgPT09ICdzdHlsZScpIHtcbiAgICAgICAgICAgIG5vZGUuc3R5bGUuY3NzVGV4dCA9IGF0dHJpYnV0ZXNba2V5XTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChrZXkgPT09ICdfX3ZhbHVlJyB8fCBkZXNjcmlwdG9yc1trZXldICYmIGRlc2NyaXB0b3JzW2tleV0uc2V0KSB7XG4gICAgICAgICAgICBub2RlW2tleV0gPSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhdHRyKG5vZGUsIGtleSwgYXR0cmlidXRlc1trZXldKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmZ1bmN0aW9uIHNldF9zdmdfYXR0cmlidXRlcyhub2RlLCBhdHRyaWJ1dGVzKSB7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gYXR0cmlidXRlcykge1xuICAgICAgICBhdHRyKG5vZGUsIGtleSwgYXR0cmlidXRlc1trZXldKTtcbiAgICB9XG59XG5mdW5jdGlvbiBzZXRfY3VzdG9tX2VsZW1lbnRfZGF0YShub2RlLCBwcm9wLCB2YWx1ZSkge1xuICAgIGlmIChwcm9wIGluIG5vZGUpIHtcbiAgICAgICAgbm9kZVtwcm9wXSA9IHZhbHVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgYXR0cihub2RlLCBwcm9wLCB2YWx1ZSk7XG4gICAgfVxufVxuZnVuY3Rpb24geGxpbmtfYXR0cihub2RlLCBhdHRyaWJ1dGUsIHZhbHVlKSB7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGVOUygnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaycsIGF0dHJpYnV0ZSwgdmFsdWUpO1xufVxuZnVuY3Rpb24gZ2V0X2JpbmRpbmdfZ3JvdXBfdmFsdWUoZ3JvdXApIHtcbiAgICBjb25zdCB2YWx1ZSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JvdXAubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgaWYgKGdyb3VwW2ldLmNoZWNrZWQpXG4gICAgICAgICAgICB2YWx1ZS5wdXNoKGdyb3VwW2ldLl9fdmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG59XG5mdW5jdGlvbiB0b19udW1iZXIodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgPT09ICcnID8gdW5kZWZpbmVkIDogK3ZhbHVlO1xufVxuZnVuY3Rpb24gdGltZV9yYW5nZXNfdG9fYXJyYXkocmFuZ2VzKSB7XG4gICAgY29uc3QgYXJyYXkgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhbmdlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBhcnJheS5wdXNoKHsgc3RhcnQ6IHJhbmdlcy5zdGFydChpKSwgZW5kOiByYW5nZXMuZW5kKGkpIH0pO1xuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG59XG5mdW5jdGlvbiBjaGlsZHJlbihlbGVtZW50KSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oZWxlbWVudC5jaGlsZE5vZGVzKTtcbn1cbmZ1bmN0aW9uIGNsYWltX2VsZW1lbnQobm9kZXMsIG5hbWUsIGF0dHJpYnV0ZXMsIHN2Zykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IG5vZGVzW2ldO1xuICAgICAgICBpZiAobm9kZS5ub2RlTmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgICAgbGV0IGogPSAwO1xuICAgICAgICAgICAgd2hpbGUgKGogPCBub2RlLmF0dHJpYnV0ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlID0gbm9kZS5hdHRyaWJ1dGVzW2pdO1xuICAgICAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzW2F0dHJpYnV0ZS5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBqKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyaWJ1dGUubmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5vZGVzLnNwbGljZShpLCAxKVswXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3ZnID8gc3ZnX2VsZW1lbnQobmFtZSkgOiBlbGVtZW50KG5hbWUpO1xufVxuZnVuY3Rpb24gY2xhaW1fdGV4dChub2RlcywgZGF0YSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IG5vZGVzW2ldO1xuICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICAgICAgbm9kZS5kYXRhID0gJycgKyBkYXRhO1xuICAgICAgICAgICAgcmV0dXJuIG5vZGVzLnNwbGljZShpLCAxKVswXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGV4dChkYXRhKTtcbn1cbmZ1bmN0aW9uIGNsYWltX3NwYWNlKG5vZGVzKSB7XG4gICAgcmV0dXJuIGNsYWltX3RleHQobm9kZXMsICcgJyk7XG59XG5mdW5jdGlvbiBzZXRfZGF0YSh0ZXh0LCBkYXRhKSB7XG4gICAgZGF0YSA9ICcnICsgZGF0YTtcbiAgICBpZiAodGV4dC5kYXRhICE9PSBkYXRhKVxuICAgICAgICB0ZXh0LmRhdGEgPSBkYXRhO1xufVxuZnVuY3Rpb24gc2V0X2lucHV0X3ZhbHVlKGlucHV0LCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSAhPSBudWxsIHx8IGlucHV0LnZhbHVlKSB7XG4gICAgICAgIGlucHV0LnZhbHVlID0gdmFsdWU7XG4gICAgfVxufVxuZnVuY3Rpb24gc2V0X2lucHV0X3R5cGUoaW5wdXQsIHR5cGUpIHtcbiAgICB0cnkge1xuICAgICAgICBpbnB1dC50eXBlID0gdHlwZTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgIH1cbn1cbmZ1bmN0aW9uIHNldF9zdHlsZShub2RlLCBrZXksIHZhbHVlLCBpbXBvcnRhbnQpIHtcbiAgICBub2RlLnN0eWxlLnNldFByb3BlcnR5KGtleSwgdmFsdWUsIGltcG9ydGFudCA/ICdpbXBvcnRhbnQnIDogJycpO1xufVxuZnVuY3Rpb24gc2VsZWN0X29wdGlvbihzZWxlY3QsIHZhbHVlKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWxlY3Qub3B0aW9ucy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBjb25zdCBvcHRpb24gPSBzZWxlY3Qub3B0aW9uc1tpXTtcbiAgICAgICAgaWYgKG9wdGlvbi5fX3ZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgb3B0aW9uLnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbn1cbmZ1bmN0aW9uIHNlbGVjdF9vcHRpb25zKHNlbGVjdCwgdmFsdWUpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdC5vcHRpb25zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbiA9IHNlbGVjdC5vcHRpb25zW2ldO1xuICAgICAgICBvcHRpb24uc2VsZWN0ZWQgPSB+dmFsdWUuaW5kZXhPZihvcHRpb24uX192YWx1ZSk7XG4gICAgfVxufVxuZnVuY3Rpb24gc2VsZWN0X3ZhbHVlKHNlbGVjdCkge1xuICAgIGNvbnN0IHNlbGVjdGVkX29wdGlvbiA9IHNlbGVjdC5xdWVyeVNlbGVjdG9yKCc6Y2hlY2tlZCcpIHx8IHNlbGVjdC5vcHRpb25zWzBdO1xuICAgIHJldHVybiBzZWxlY3RlZF9vcHRpb24gJiYgc2VsZWN0ZWRfb3B0aW9uLl9fdmFsdWU7XG59XG5mdW5jdGlvbiBzZWxlY3RfbXVsdGlwbGVfdmFsdWUoc2VsZWN0KSB7XG4gICAgcmV0dXJuIFtdLm1hcC5jYWxsKHNlbGVjdC5xdWVyeVNlbGVjdG9yQWxsKCc6Y2hlY2tlZCcpLCBvcHRpb24gPT4gb3B0aW9uLl9fdmFsdWUpO1xufVxuLy8gdW5mb3J0dW5hdGVseSB0aGlzIGNhbid0IGJlIGEgY29uc3RhbnQgYXMgdGhhdCB3b3VsZG4ndCBiZSB0cmVlLXNoYWtlYWJsZVxuLy8gc28gd2UgY2FjaGUgdGhlIHJlc3VsdCBpbnN0ZWFkXG5sZXQgY3Jvc3NvcmlnaW47XG5mdW5jdGlvbiBpc19jcm9zc29yaWdpbigpIHtcbiAgICBpZiAoY3Jvc3NvcmlnaW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjcm9zc29yaWdpbiA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5wYXJlbnQpIHtcbiAgICAgICAgICAgICAgICB2b2lkIHdpbmRvdy5wYXJlbnQuZG9jdW1lbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjcm9zc29yaWdpbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNyb3Nzb3JpZ2luO1xufVxuZnVuY3Rpb24gYWRkX3Jlc2l6ZV9saXN0ZW5lcihub2RlLCBmbikge1xuICAgIGNvbnN0IGNvbXB1dGVkX3N0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShub2RlKTtcbiAgICBjb25zdCB6X2luZGV4ID0gKHBhcnNlSW50KGNvbXB1dGVkX3N0eWxlLnpJbmRleCkgfHwgMCkgLSAxO1xuICAgIGlmIChjb21wdXRlZF9zdHlsZS5wb3NpdGlvbiA9PT0gJ3N0YXRpYycpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XG4gICAgfVxuICAgIGNvbnN0IGlmcmFtZSA9IGVsZW1lbnQoJ2lmcmFtZScpO1xuICAgIGlmcmFtZS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgYGRpc3BsYXk6IGJsb2NrOyBwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMDsgbGVmdDogMDsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTAwJTsgYCArXG4gICAgICAgIGBvdmVyZmxvdzogaGlkZGVuOyBib3JkZXI6IDA7IG9wYWNpdHk6IDA7IHBvaW50ZXItZXZlbnRzOiBub25lOyB6LWluZGV4OiAke3pfaW5kZXh9O2ApO1xuICAgIGlmcmFtZS5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgICBpZnJhbWUudGFiSW5kZXggPSAtMTtcbiAgICBsZXQgdW5zdWJzY3JpYmU7XG4gICAgaWYgKGlzX2Nyb3Nzb3JpZ2luKCkpIHtcbiAgICAgICAgaWZyYW1lLnNyYyA9IGBkYXRhOnRleHQvaHRtbCw8c2NyaXB0Pm9ucmVzaXplPWZ1bmN0aW9uKCl7cGFyZW50LnBvc3RNZXNzYWdlKDAsJyonKX08L3NjcmlwdD5gO1xuICAgICAgICB1bnN1YnNjcmliZSA9IGxpc3Rlbih3aW5kb3csICdtZXNzYWdlJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZXZlbnQuc291cmNlID09PSBpZnJhbWUuY29udGVudFdpbmRvdylcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmcmFtZS5zcmMgPSAnYWJvdXQ6YmxhbmsnO1xuICAgICAgICBpZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgdW5zdWJzY3JpYmUgPSBsaXN0ZW4oaWZyYW1lLmNvbnRlbnRXaW5kb3csICdyZXNpemUnLCBmbik7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGFwcGVuZChub2RlLCBpZnJhbWUpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGRldGFjaChpZnJhbWUpO1xuICAgICAgICBpZiAodW5zdWJzY3JpYmUpXG4gICAgICAgICAgICB1bnN1YnNjcmliZSgpO1xuICAgIH07XG59XG5mdW5jdGlvbiB0b2dnbGVfY2xhc3MoZWxlbWVudCwgbmFtZSwgdG9nZ2xlKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3RbdG9nZ2xlID8gJ2FkZCcgOiAncmVtb3ZlJ10obmFtZSk7XG59XG5mdW5jdGlvbiBjdXN0b21fZXZlbnQodHlwZSwgZGV0YWlsKSB7XG4gICAgY29uc3QgZSA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICAgIGUuaW5pdEN1c3RvbUV2ZW50KHR5cGUsIGZhbHNlLCBmYWxzZSwgZGV0YWlsKTtcbiAgICByZXR1cm4gZTtcbn1cbmZ1bmN0aW9uIHF1ZXJ5X3NlbGVjdG9yX2FsbChzZWxlY3RvciwgcGFyZW50ID0gZG9jdW1lbnQuYm9keSkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG59XG5jbGFzcyBIdG1sVGFnIHtcbiAgICBjb25zdHJ1Y3RvcihodG1sLCBhbmNob3IgPSBudWxsKSB7XG4gICAgICAgIHRoaXMuZSA9IGVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0aGlzLmEgPSBhbmNob3I7XG4gICAgICAgIHRoaXMudShodG1sKTtcbiAgICB9XG4gICAgbSh0YXJnZXQsIGFuY2hvciA9IG51bGwpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm4ubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGluc2VydCh0YXJnZXQsIHRoaXMubltpXSwgYW5jaG9yKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnQgPSB0YXJnZXQ7XG4gICAgfVxuICAgIHUoaHRtbCkge1xuICAgICAgICB0aGlzLmUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgdGhpcy5uID0gQXJyYXkuZnJvbSh0aGlzLmUuY2hpbGROb2Rlcyk7XG4gICAgfVxuICAgIHAoaHRtbCkge1xuICAgICAgICB0aGlzLmQoKTtcbiAgICAgICAgdGhpcy51KGh0bWwpO1xuICAgICAgICB0aGlzLm0odGhpcy50LCB0aGlzLmEpO1xuICAgIH1cbiAgICBkKCkge1xuICAgICAgICB0aGlzLm4uZm9yRWFjaChkZXRhY2gpO1xuICAgIH1cbn1cblxuY29uc3QgYWN0aXZlX2RvY3MgPSBuZXcgU2V0KCk7XG5sZXQgYWN0aXZlID0gMDtcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kYXJrc2t5YXBwL3N0cmluZy1oYXNoL2Jsb2IvbWFzdGVyL2luZGV4LmpzXG5mdW5jdGlvbiBoYXNoKHN0cikge1xuICAgIGxldCBoYXNoID0gNTM4MTtcbiAgICBsZXQgaSA9IHN0ci5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSlcbiAgICAgICAgaGFzaCA9ICgoaGFzaCA8PCA1KSAtIGhhc2gpIF4gc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgcmV0dXJuIGhhc2ggPj4+IDA7XG59XG5mdW5jdGlvbiBjcmVhdGVfcnVsZShub2RlLCBhLCBiLCBkdXJhdGlvbiwgZGVsYXksIGVhc2UsIGZuLCB1aWQgPSAwKSB7XG4gICAgY29uc3Qgc3RlcCA9IDE2LjY2NiAvIGR1cmF0aW9uO1xuICAgIGxldCBrZXlmcmFtZXMgPSAne1xcbic7XG4gICAgZm9yIChsZXQgcCA9IDA7IHAgPD0gMTsgcCArPSBzdGVwKSB7XG4gICAgICAgIGNvbnN0IHQgPSBhICsgKGIgLSBhKSAqIGVhc2UocCk7XG4gICAgICAgIGtleWZyYW1lcyArPSBwICogMTAwICsgYCV7JHtmbih0LCAxIC0gdCl9fVxcbmA7XG4gICAgfVxuICAgIGNvbnN0IHJ1bGUgPSBrZXlmcmFtZXMgKyBgMTAwJSB7JHtmbihiLCAxIC0gYil9fVxcbn1gO1xuICAgIGNvbnN0IG5hbWUgPSBgX19zdmVsdGVfJHtoYXNoKHJ1bGUpfV8ke3VpZH1gO1xuICAgIGNvbnN0IGRvYyA9IG5vZGUub3duZXJEb2N1bWVudDtcbiAgICBhY3RpdmVfZG9jcy5hZGQoZG9jKTtcbiAgICBjb25zdCBzdHlsZXNoZWV0ID0gZG9jLl9fc3ZlbHRlX3N0eWxlc2hlZXQgfHwgKGRvYy5fX3N2ZWx0ZV9zdHlsZXNoZWV0ID0gZG9jLmhlYWQuYXBwZW5kQ2hpbGQoZWxlbWVudCgnc3R5bGUnKSkuc2hlZXQpO1xuICAgIGNvbnN0IGN1cnJlbnRfcnVsZXMgPSBkb2MuX19zdmVsdGVfcnVsZXMgfHwgKGRvYy5fX3N2ZWx0ZV9ydWxlcyA9IHt9KTtcbiAgICBpZiAoIWN1cnJlbnRfcnVsZXNbbmFtZV0pIHtcbiAgICAgICAgY3VycmVudF9ydWxlc1tuYW1lXSA9IHRydWU7XG4gICAgICAgIHN0eWxlc2hlZXQuaW5zZXJ0UnVsZShgQGtleWZyYW1lcyAke25hbWV9ICR7cnVsZX1gLCBzdHlsZXNoZWV0LmNzc1J1bGVzLmxlbmd0aCk7XG4gICAgfVxuICAgIGNvbnN0IGFuaW1hdGlvbiA9IG5vZGUuc3R5bGUuYW5pbWF0aW9uIHx8ICcnO1xuICAgIG5vZGUuc3R5bGUuYW5pbWF0aW9uID0gYCR7YW5pbWF0aW9uID8gYCR7YW5pbWF0aW9ufSwgYCA6IGBgfSR7bmFtZX0gJHtkdXJhdGlvbn1tcyBsaW5lYXIgJHtkZWxheX1tcyAxIGJvdGhgO1xuICAgIGFjdGl2ZSArPSAxO1xuICAgIHJldHVybiBuYW1lO1xufVxuZnVuY3Rpb24gZGVsZXRlX3J1bGUobm9kZSwgbmFtZSkge1xuICAgIGNvbnN0IHByZXZpb3VzID0gKG5vZGUuc3R5bGUuYW5pbWF0aW9uIHx8ICcnKS5zcGxpdCgnLCAnKTtcbiAgICBjb25zdCBuZXh0ID0gcHJldmlvdXMuZmlsdGVyKG5hbWVcbiAgICAgICAgPyBhbmltID0+IGFuaW0uaW5kZXhPZihuYW1lKSA8IDAgLy8gcmVtb3ZlIHNwZWNpZmljIGFuaW1hdGlvblxuICAgICAgICA6IGFuaW0gPT4gYW5pbS5pbmRleE9mKCdfX3N2ZWx0ZScpID09PSAtMSAvLyByZW1vdmUgYWxsIFN2ZWx0ZSBhbmltYXRpb25zXG4gICAgKTtcbiAgICBjb25zdCBkZWxldGVkID0gcHJldmlvdXMubGVuZ3RoIC0gbmV4dC5sZW5ndGg7XG4gICAgaWYgKGRlbGV0ZWQpIHtcbiAgICAgICAgbm9kZS5zdHlsZS5hbmltYXRpb24gPSBuZXh0LmpvaW4oJywgJyk7XG4gICAgICAgIGFjdGl2ZSAtPSBkZWxldGVkO1xuICAgICAgICBpZiAoIWFjdGl2ZSlcbiAgICAgICAgICAgIGNsZWFyX3J1bGVzKCk7XG4gICAgfVxufVxuZnVuY3Rpb24gY2xlYXJfcnVsZXMoKSB7XG4gICAgcmFmKCgpID0+IHtcbiAgICAgICAgaWYgKGFjdGl2ZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgYWN0aXZlX2RvY3MuZm9yRWFjaChkb2MgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3R5bGVzaGVldCA9IGRvYy5fX3N2ZWx0ZV9zdHlsZXNoZWV0O1xuICAgICAgICAgICAgbGV0IGkgPSBzdHlsZXNoZWV0LmNzc1J1bGVzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChpLS0pXG4gICAgICAgICAgICAgICAgc3R5bGVzaGVldC5kZWxldGVSdWxlKGkpO1xuICAgICAgICAgICAgZG9jLl9fc3ZlbHRlX3J1bGVzID0ge307XG4gICAgICAgIH0pO1xuICAgICAgICBhY3RpdmVfZG9jcy5jbGVhcigpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVfYW5pbWF0aW9uKG5vZGUsIGZyb20sIGZuLCBwYXJhbXMpIHtcbiAgICBpZiAoIWZyb20pXG4gICAgICAgIHJldHVybiBub29wO1xuICAgIGNvbnN0IHRvID0gbm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBpZiAoZnJvbS5sZWZ0ID09PSB0by5sZWZ0ICYmIGZyb20ucmlnaHQgPT09IHRvLnJpZ2h0ICYmIGZyb20udG9wID09PSB0by50b3AgJiYgZnJvbS5ib3R0b20gPT09IHRvLmJvdHRvbSlcbiAgICAgICAgcmV0dXJuIG5vb3A7XG4gICAgY29uc3QgeyBkZWxheSA9IDAsIGR1cmF0aW9uID0gMzAwLCBlYXNpbmcgPSBpZGVudGl0eSwgXG4gICAgLy8gQHRzLWlnbm9yZSB0b2RvOiBzaG91bGQgdGhpcyBiZSBzZXBhcmF0ZWQgZnJvbSBkZXN0cnVjdHVyaW5nPyBPciBzdGFydC9lbmQgYWRkZWQgdG8gcHVibGljIGFwaSBhbmQgZG9jdW1lbnRhdGlvbj9cbiAgICBzdGFydDogc3RhcnRfdGltZSA9IG5vdygpICsgZGVsYXksIFxuICAgIC8vIEB0cy1pZ25vcmUgdG9kbzpcbiAgICBlbmQgPSBzdGFydF90aW1lICsgZHVyYXRpb24sIHRpY2sgPSBub29wLCBjc3MgfSA9IGZuKG5vZGUsIHsgZnJvbSwgdG8gfSwgcGFyYW1zKTtcbiAgICBsZXQgcnVubmluZyA9IHRydWU7XG4gICAgbGV0IHN0YXJ0ZWQgPSBmYWxzZTtcbiAgICBsZXQgbmFtZTtcbiAgICBmdW5jdGlvbiBzdGFydCgpIHtcbiAgICAgICAgaWYgKGNzcykge1xuICAgICAgICAgICAgbmFtZSA9IGNyZWF0ZV9ydWxlKG5vZGUsIDAsIDEsIGR1cmF0aW9uLCBkZWxheSwgZWFzaW5nLCBjc3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZGVsYXkpIHtcbiAgICAgICAgICAgIHN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgICAgIGlmIChjc3MpXG4gICAgICAgICAgICBkZWxldGVfcnVsZShub2RlLCBuYW1lKTtcbiAgICAgICAgcnVubmluZyA9IGZhbHNlO1xuICAgIH1cbiAgICBsb29wKG5vdyA9PiB7XG4gICAgICAgIGlmICghc3RhcnRlZCAmJiBub3cgPj0gc3RhcnRfdGltZSkge1xuICAgICAgICAgICAgc3RhcnRlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXJ0ZWQgJiYgbm93ID49IGVuZCkge1xuICAgICAgICAgICAgdGljaygxLCAwKTtcbiAgICAgICAgICAgIHN0b3AoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXJ1bm5pbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhcnRlZCkge1xuICAgICAgICAgICAgY29uc3QgcCA9IG5vdyAtIHN0YXJ0X3RpbWU7XG4gICAgICAgICAgICBjb25zdCB0ID0gMCArIDEgKiBlYXNpbmcocCAvIGR1cmF0aW9uKTtcbiAgICAgICAgICAgIHRpY2sodCwgMSAtIHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHN0YXJ0KCk7XG4gICAgdGljaygwLCAxKTtcbiAgICByZXR1cm4gc3RvcDtcbn1cbmZ1bmN0aW9uIGZpeF9wb3NpdGlvbihub2RlKSB7XG4gICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKG5vZGUpO1xuICAgIGlmIChzdHlsZS5wb3NpdGlvbiAhPT0gJ2Fic29sdXRlJyAmJiBzdHlsZS5wb3NpdGlvbiAhPT0gJ2ZpeGVkJykge1xuICAgICAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IHN0eWxlO1xuICAgICAgICBjb25zdCBhID0gbm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgbm9kZS5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgIG5vZGUuc3R5bGUud2lkdGggPSB3aWR0aDtcbiAgICAgICAgbm9kZS5zdHlsZS5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIGFkZF90cmFuc2Zvcm0obm9kZSwgYSk7XG4gICAgfVxufVxuZnVuY3Rpb24gYWRkX3RyYW5zZm9ybShub2RlLCBhKSB7XG4gICAgY29uc3QgYiA9IG5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgaWYgKGEubGVmdCAhPT0gYi5sZWZ0IHx8IGEudG9wICE9PSBiLnRvcCkge1xuICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGUobm9kZSk7XG4gICAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IHN0eWxlLnRyYW5zZm9ybSA9PT0gJ25vbmUnID8gJycgOiBzdHlsZS50cmFuc2Zvcm07XG4gICAgICAgIG5vZGUuc3R5bGUudHJhbnNmb3JtID0gYCR7dHJhbnNmb3JtfSB0cmFuc2xhdGUoJHthLmxlZnQgLSBiLmxlZnR9cHgsICR7YS50b3AgLSBiLnRvcH1weClgO1xuICAgIH1cbn1cblxubGV0IGN1cnJlbnRfY29tcG9uZW50O1xuZnVuY3Rpb24gc2V0X2N1cnJlbnRfY29tcG9uZW50KGNvbXBvbmVudCkge1xuICAgIGN1cnJlbnRfY29tcG9uZW50ID0gY29tcG9uZW50O1xufVxuZnVuY3Rpb24gZ2V0X2N1cnJlbnRfY29tcG9uZW50KCkge1xuICAgIGlmICghY3VycmVudF9jb21wb25lbnQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRnVuY3Rpb24gY2FsbGVkIG91dHNpZGUgY29tcG9uZW50IGluaXRpYWxpemF0aW9uYCk7XG4gICAgcmV0dXJuIGN1cnJlbnRfY29tcG9uZW50O1xufVxuZnVuY3Rpb24gYmVmb3JlVXBkYXRlKGZuKSB7XG4gICAgZ2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQuYmVmb3JlX3VwZGF0ZS5wdXNoKGZuKTtcbn1cbmZ1bmN0aW9uIG9uTW91bnQoZm4pIHtcbiAgICBnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5vbl9tb3VudC5wdXNoKGZuKTtcbn1cbmZ1bmN0aW9uIGFmdGVyVXBkYXRlKGZuKSB7XG4gICAgZ2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQuYWZ0ZXJfdXBkYXRlLnB1c2goZm4pO1xufVxuZnVuY3Rpb24gb25EZXN0cm95KGZuKSB7XG4gICAgZ2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQub25fZGVzdHJveS5wdXNoKGZuKTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZUV2ZW50RGlzcGF0Y2hlcigpIHtcbiAgICBjb25zdCBjb21wb25lbnQgPSBnZXRfY3VycmVudF9jb21wb25lbnQoKTtcbiAgICByZXR1cm4gKHR5cGUsIGRldGFpbCkgPT4ge1xuICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBjb21wb25lbnQuJCQuY2FsbGJhY2tzW3R5cGVdO1xuICAgICAgICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICAvLyBUT0RPIGFyZSB0aGVyZSBzaXR1YXRpb25zIHdoZXJlIGV2ZW50cyBjb3VsZCBiZSBkaXNwYXRjaGVkXG4gICAgICAgICAgICAvLyBpbiBhIHNlcnZlciAobm9uLURPTSkgZW52aXJvbm1lbnQ/XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGN1c3RvbV9ldmVudCh0eXBlLCBkZXRhaWwpO1xuICAgICAgICAgICAgY2FsbGJhY2tzLnNsaWNlKCkuZm9yRWFjaChmbiA9PiB7XG4gICAgICAgICAgICAgICAgZm4uY2FsbChjb21wb25lbnQsIGV2ZW50KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cbmZ1bmN0aW9uIHNldENvbnRleHQoa2V5LCBjb250ZXh0KSB7XG4gICAgZ2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQuY29udGV4dC5zZXQoa2V5LCBjb250ZXh0KTtcbn1cbmZ1bmN0aW9uIGdldENvbnRleHQoa2V5KSB7XG4gICAgcmV0dXJuIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmNvbnRleHQuZ2V0KGtleSk7XG59XG4vLyBUT0RPIGZpZ3VyZSBvdXQgaWYgd2Ugc3RpbGwgd2FudCB0byBzdXBwb3J0XG4vLyBzaG9ydGhhbmQgZXZlbnRzLCBvciBpZiB3ZSB3YW50IHRvIGltcGxlbWVudFxuLy8gYSByZWFsIGJ1YmJsaW5nIG1lY2hhbmlzbVxuZnVuY3Rpb24gYnViYmxlKGNvbXBvbmVudCwgZXZlbnQpIHtcbiAgICBjb25zdCBjYWxsYmFja3MgPSBjb21wb25lbnQuJCQuY2FsbGJhY2tzW2V2ZW50LnR5cGVdO1xuICAgIGlmIChjYWxsYmFja3MpIHtcbiAgICAgICAgY2FsbGJhY2tzLnNsaWNlKCkuZm9yRWFjaChmbiA9PiBmbihldmVudCkpO1xuICAgIH1cbn1cblxuY29uc3QgZGlydHlfY29tcG9uZW50cyA9IFtdO1xuY29uc3QgaW50cm9zID0geyBlbmFibGVkOiBmYWxzZSB9O1xuY29uc3QgYmluZGluZ19jYWxsYmFja3MgPSBbXTtcbmNvbnN0IHJlbmRlcl9jYWxsYmFja3MgPSBbXTtcbmNvbnN0IGZsdXNoX2NhbGxiYWNrcyA9IFtdO1xuY29uc3QgcmVzb2x2ZWRfcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xubGV0IHVwZGF0ZV9zY2hlZHVsZWQgPSBmYWxzZTtcbmZ1bmN0aW9uIHNjaGVkdWxlX3VwZGF0ZSgpIHtcbiAgICBpZiAoIXVwZGF0ZV9zY2hlZHVsZWQpIHtcbiAgICAgICAgdXBkYXRlX3NjaGVkdWxlZCA9IHRydWU7XG4gICAgICAgIHJlc29sdmVkX3Byb21pc2UudGhlbihmbHVzaCk7XG4gICAgfVxufVxuZnVuY3Rpb24gdGljaygpIHtcbiAgICBzY2hlZHVsZV91cGRhdGUoKTtcbiAgICByZXR1cm4gcmVzb2x2ZWRfcHJvbWlzZTtcbn1cbmZ1bmN0aW9uIGFkZF9yZW5kZXJfY2FsbGJhY2soZm4pIHtcbiAgICByZW5kZXJfY2FsbGJhY2tzLnB1c2goZm4pO1xufVxuZnVuY3Rpb24gYWRkX2ZsdXNoX2NhbGxiYWNrKGZuKSB7XG4gICAgZmx1c2hfY2FsbGJhY2tzLnB1c2goZm4pO1xufVxubGV0IGZsdXNoaW5nID0gZmFsc2U7XG5jb25zdCBzZWVuX2NhbGxiYWNrcyA9IG5ldyBTZXQoKTtcbmZ1bmN0aW9uIGZsdXNoKCkge1xuICAgIGlmIChmbHVzaGluZylcbiAgICAgICAgcmV0dXJuO1xuICAgIGZsdXNoaW5nID0gdHJ1ZTtcbiAgICBkbyB7XG4gICAgICAgIC8vIGZpcnN0LCBjYWxsIGJlZm9yZVVwZGF0ZSBmdW5jdGlvbnNcbiAgICAgICAgLy8gYW5kIHVwZGF0ZSBjb21wb25lbnRzXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGlydHlfY29tcG9uZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gZGlydHlfY29tcG9uZW50c1tpXTtcbiAgICAgICAgICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChjb21wb25lbnQpO1xuICAgICAgICAgICAgdXBkYXRlKGNvbXBvbmVudC4kJCk7XG4gICAgICAgIH1cbiAgICAgICAgZGlydHlfY29tcG9uZW50cy5sZW5ndGggPSAwO1xuICAgICAgICB3aGlsZSAoYmluZGluZ19jYWxsYmFja3MubGVuZ3RoKVxuICAgICAgICAgICAgYmluZGluZ19jYWxsYmFja3MucG9wKCkoKTtcbiAgICAgICAgLy8gdGhlbiwgb25jZSBjb21wb25lbnRzIGFyZSB1cGRhdGVkLCBjYWxsXG4gICAgICAgIC8vIGFmdGVyVXBkYXRlIGZ1bmN0aW9ucy4gVGhpcyBtYXkgY2F1c2VcbiAgICAgICAgLy8gc3Vic2VxdWVudCB1cGRhdGVzLi4uXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVuZGVyX2NhbGxiYWNrcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgY2FsbGJhY2sgPSByZW5kZXJfY2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgaWYgKCFzZWVuX2NhbGxiYWNrcy5oYXMoY2FsbGJhY2spKSB7XG4gICAgICAgICAgICAgICAgLy8gLi4uc28gZ3VhcmQgYWdhaW5zdCBpbmZpbml0ZSBsb29wc1xuICAgICAgICAgICAgICAgIHNlZW5fY2FsbGJhY2tzLmFkZChjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZW5kZXJfY2FsbGJhY2tzLmxlbmd0aCA9IDA7XG4gICAgfSB3aGlsZSAoZGlydHlfY29tcG9uZW50cy5sZW5ndGgpO1xuICAgIHdoaWxlIChmbHVzaF9jYWxsYmFja3MubGVuZ3RoKSB7XG4gICAgICAgIGZsdXNoX2NhbGxiYWNrcy5wb3AoKSgpO1xuICAgIH1cbiAgICB1cGRhdGVfc2NoZWR1bGVkID0gZmFsc2U7XG4gICAgZmx1c2hpbmcgPSBmYWxzZTtcbiAgICBzZWVuX2NhbGxiYWNrcy5jbGVhcigpO1xufVxuZnVuY3Rpb24gdXBkYXRlKCQkKSB7XG4gICAgaWYgKCQkLmZyYWdtZW50ICE9PSBudWxsKSB7XG4gICAgICAgICQkLnVwZGF0ZSgpO1xuICAgICAgICBydW5fYWxsKCQkLmJlZm9yZV91cGRhdGUpO1xuICAgICAgICBjb25zdCBkaXJ0eSA9ICQkLmRpcnR5O1xuICAgICAgICAkJC5kaXJ0eSA9IFstMV07XG4gICAgICAgICQkLmZyYWdtZW50ICYmICQkLmZyYWdtZW50LnAoJCQuY3R4LCBkaXJ0eSk7XG4gICAgICAgICQkLmFmdGVyX3VwZGF0ZS5mb3JFYWNoKGFkZF9yZW5kZXJfY2FsbGJhY2spO1xuICAgIH1cbn1cblxubGV0IHByb21pc2U7XG5mdW5jdGlvbiB3YWl0KCkge1xuICAgIGlmICghcHJvbWlzZSkge1xuICAgICAgICBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBwcm9taXNlID0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlO1xufVxuZnVuY3Rpb24gZGlzcGF0Y2gobm9kZSwgZGlyZWN0aW9uLCBraW5kKSB7XG4gICAgbm9kZS5kaXNwYXRjaEV2ZW50KGN1c3RvbV9ldmVudChgJHtkaXJlY3Rpb24gPyAnaW50cm8nIDogJ291dHJvJ30ke2tpbmR9YCkpO1xufVxuY29uc3Qgb3V0cm9pbmcgPSBuZXcgU2V0KCk7XG5sZXQgb3V0cm9zO1xuZnVuY3Rpb24gZ3JvdXBfb3V0cm9zKCkge1xuICAgIG91dHJvcyA9IHtcbiAgICAgICAgcjogMCxcbiAgICAgICAgYzogW10sXG4gICAgICAgIHA6IG91dHJvcyAvLyBwYXJlbnQgZ3JvdXBcbiAgICB9O1xufVxuZnVuY3Rpb24gY2hlY2tfb3V0cm9zKCkge1xuICAgIGlmICghb3V0cm9zLnIpIHtcbiAgICAgICAgcnVuX2FsbChvdXRyb3MuYyk7XG4gICAgfVxuICAgIG91dHJvcyA9IG91dHJvcy5wO1xufVxuZnVuY3Rpb24gdHJhbnNpdGlvbl9pbihibG9jaywgbG9jYWwpIHtcbiAgICBpZiAoYmxvY2sgJiYgYmxvY2suaSkge1xuICAgICAgICBvdXRyb2luZy5kZWxldGUoYmxvY2spO1xuICAgICAgICBibG9jay5pKGxvY2FsKTtcbiAgICB9XG59XG5mdW5jdGlvbiB0cmFuc2l0aW9uX291dChibG9jaywgbG9jYWwsIGRldGFjaCwgY2FsbGJhY2spIHtcbiAgICBpZiAoYmxvY2sgJiYgYmxvY2subykge1xuICAgICAgICBpZiAob3V0cm9pbmcuaGFzKGJsb2NrKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgb3V0cm9pbmcuYWRkKGJsb2NrKTtcbiAgICAgICAgb3V0cm9zLmMucHVzaCgoKSA9PiB7XG4gICAgICAgICAgICBvdXRyb2luZy5kZWxldGUoYmxvY2spO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRldGFjaClcbiAgICAgICAgICAgICAgICAgICAgYmxvY2suZCgxKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYmxvY2subyhsb2NhbCk7XG4gICAgfVxufVxuY29uc3QgbnVsbF90cmFuc2l0aW9uID0geyBkdXJhdGlvbjogMCB9O1xuZnVuY3Rpb24gY3JlYXRlX2luX3RyYW5zaXRpb24obm9kZSwgZm4sIHBhcmFtcykge1xuICAgIGxldCBjb25maWcgPSBmbihub2RlLCBwYXJhbXMpO1xuICAgIGxldCBydW5uaW5nID0gZmFsc2U7XG4gICAgbGV0IGFuaW1hdGlvbl9uYW1lO1xuICAgIGxldCB0YXNrO1xuICAgIGxldCB1aWQgPSAwO1xuICAgIGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgICAgIGlmIChhbmltYXRpb25fbmFtZSlcbiAgICAgICAgICAgIGRlbGV0ZV9ydWxlKG5vZGUsIGFuaW1hdGlvbl9uYW1lKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ28oKSB7XG4gICAgICAgIGNvbnN0IHsgZGVsYXkgPSAwLCBkdXJhdGlvbiA9IDMwMCwgZWFzaW5nID0gaWRlbnRpdHksIHRpY2sgPSBub29wLCBjc3MgfSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG4gICAgICAgIGlmIChjc3MpXG4gICAgICAgICAgICBhbmltYXRpb25fbmFtZSA9IGNyZWF0ZV9ydWxlKG5vZGUsIDAsIDEsIGR1cmF0aW9uLCBkZWxheSwgZWFzaW5nLCBjc3MsIHVpZCsrKTtcbiAgICAgICAgdGljaygwLCAxKTtcbiAgICAgICAgY29uc3Qgc3RhcnRfdGltZSA9IG5vdygpICsgZGVsYXk7XG4gICAgICAgIGNvbnN0IGVuZF90aW1lID0gc3RhcnRfdGltZSArIGR1cmF0aW9uO1xuICAgICAgICBpZiAodGFzaylcbiAgICAgICAgICAgIHRhc2suYWJvcnQoKTtcbiAgICAgICAgcnVubmluZyA9IHRydWU7XG4gICAgICAgIGFkZF9yZW5kZXJfY2FsbGJhY2soKCkgPT4gZGlzcGF0Y2gobm9kZSwgdHJ1ZSwgJ3N0YXJ0JykpO1xuICAgICAgICB0YXNrID0gbG9vcChub3cgPT4ge1xuICAgICAgICAgICAgaWYgKHJ1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAobm93ID49IGVuZF90aW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpY2soMSwgMCk7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoKG5vZGUsIHRydWUsICdlbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcnVubmluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobm93ID49IHN0YXJ0X3RpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdCA9IGVhc2luZygobm93IC0gc3RhcnRfdGltZSkgLyBkdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRpY2sodCwgMSAtIHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBydW5uaW5nO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbGV0IHN0YXJ0ZWQgPSBmYWxzZTtcbiAgICByZXR1cm4ge1xuICAgICAgICBzdGFydCgpIHtcbiAgICAgICAgICAgIGlmIChzdGFydGVkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGRlbGV0ZV9ydWxlKG5vZGUpO1xuICAgICAgICAgICAgaWYgKGlzX2Z1bmN0aW9uKGNvbmZpZykpIHtcbiAgICAgICAgICAgICAgICBjb25maWcgPSBjb25maWcoKTtcbiAgICAgICAgICAgICAgICB3YWl0KCkudGhlbihnbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBnbygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBpbnZhbGlkYXRlKCkge1xuICAgICAgICAgICAgc3RhcnRlZCA9IGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBlbmQoKSB7XG4gICAgICAgICAgICBpZiAocnVubmluZykge1xuICAgICAgICAgICAgICAgIGNsZWFudXAoKTtcbiAgICAgICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuZnVuY3Rpb24gY3JlYXRlX291dF90cmFuc2l0aW9uKG5vZGUsIGZuLCBwYXJhbXMpIHtcbiAgICBsZXQgY29uZmlnID0gZm4obm9kZSwgcGFyYW1zKTtcbiAgICBsZXQgcnVubmluZyA9IHRydWU7XG4gICAgbGV0IGFuaW1hdGlvbl9uYW1lO1xuICAgIGNvbnN0IGdyb3VwID0gb3V0cm9zO1xuICAgIGdyb3VwLnIgKz0gMTtcbiAgICBmdW5jdGlvbiBnbygpIHtcbiAgICAgICAgY29uc3QgeyBkZWxheSA9IDAsIGR1cmF0aW9uID0gMzAwLCBlYXNpbmcgPSBpZGVudGl0eSwgdGljayA9IG5vb3AsIGNzcyB9ID0gY29uZmlnIHx8IG51bGxfdHJhbnNpdGlvbjtcbiAgICAgICAgaWYgKGNzcylcbiAgICAgICAgICAgIGFuaW1hdGlvbl9uYW1lID0gY3JlYXRlX3J1bGUobm9kZSwgMSwgMCwgZHVyYXRpb24sIGRlbGF5LCBlYXNpbmcsIGNzcyk7XG4gICAgICAgIGNvbnN0IHN0YXJ0X3RpbWUgPSBub3coKSArIGRlbGF5O1xuICAgICAgICBjb25zdCBlbmRfdGltZSA9IHN0YXJ0X3RpbWUgKyBkdXJhdGlvbjtcbiAgICAgICAgYWRkX3JlbmRlcl9jYWxsYmFjaygoKSA9PiBkaXNwYXRjaChub2RlLCBmYWxzZSwgJ3N0YXJ0JykpO1xuICAgICAgICBsb29wKG5vdyA9PiB7XG4gICAgICAgICAgICBpZiAocnVubmluZykge1xuICAgICAgICAgICAgICAgIGlmIChub3cgPj0gZW5kX3RpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGljaygwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgZGlzcGF0Y2gobm9kZSwgZmFsc2UsICdlbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEtLWdyb3VwLnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgd2lsbCByZXN1bHQgaW4gYGVuZCgpYCBiZWluZyBjYWxsZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzbyB3ZSBkb24ndCBuZWVkIHRvIGNsZWFuIHVwIGhlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bl9hbGwoZ3JvdXAuYyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobm93ID49IHN0YXJ0X3RpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdCA9IGVhc2luZygobm93IC0gc3RhcnRfdGltZSkgLyBkdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRpY2soMSAtIHQsIHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBydW5uaW5nO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGlzX2Z1bmN0aW9uKGNvbmZpZykpIHtcbiAgICAgICAgd2FpdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnKCk7XG4gICAgICAgICAgICBnbygpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGdvKCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIGVuZChyZXNldCkge1xuICAgICAgICAgICAgaWYgKHJlc2V0ICYmIGNvbmZpZy50aWNrKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLnRpY2soMSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocnVubmluZykge1xuICAgICAgICAgICAgICAgIGlmIChhbmltYXRpb25fbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlX3J1bGUobm9kZSwgYW5pbWF0aW9uX25hbWUpO1xuICAgICAgICAgICAgICAgIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59XG5mdW5jdGlvbiBjcmVhdGVfYmlkaXJlY3Rpb25hbF90cmFuc2l0aW9uKG5vZGUsIGZuLCBwYXJhbXMsIGludHJvKSB7XG4gICAgbGV0IGNvbmZpZyA9IGZuKG5vZGUsIHBhcmFtcyk7XG4gICAgbGV0IHQgPSBpbnRybyA/IDAgOiAxO1xuICAgIGxldCBydW5uaW5nX3Byb2dyYW0gPSBudWxsO1xuICAgIGxldCBwZW5kaW5nX3Byb2dyYW0gPSBudWxsO1xuICAgIGxldCBhbmltYXRpb25fbmFtZSA9IG51bGw7XG4gICAgZnVuY3Rpb24gY2xlYXJfYW5pbWF0aW9uKCkge1xuICAgICAgICBpZiAoYW5pbWF0aW9uX25hbWUpXG4gICAgICAgICAgICBkZWxldGVfcnVsZShub2RlLCBhbmltYXRpb25fbmFtZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXQocHJvZ3JhbSwgZHVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgZCA9IHByb2dyYW0uYiAtIHQ7XG4gICAgICAgIGR1cmF0aW9uICo9IE1hdGguYWJzKGQpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYTogdCxcbiAgICAgICAgICAgIGI6IHByb2dyYW0uYixcbiAgICAgICAgICAgIGQsXG4gICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgIHN0YXJ0OiBwcm9ncmFtLnN0YXJ0LFxuICAgICAgICAgICAgZW5kOiBwcm9ncmFtLnN0YXJ0ICsgZHVyYXRpb24sXG4gICAgICAgICAgICBncm91cDogcHJvZ3JhbS5ncm91cFxuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBnbyhiKSB7XG4gICAgICAgIGNvbnN0IHsgZGVsYXkgPSAwLCBkdXJhdGlvbiA9IDMwMCwgZWFzaW5nID0gaWRlbnRpdHksIHRpY2sgPSBub29wLCBjc3MgfSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG4gICAgICAgIGNvbnN0IHByb2dyYW0gPSB7XG4gICAgICAgICAgICBzdGFydDogbm93KCkgKyBkZWxheSxcbiAgICAgICAgICAgIGJcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFiKSB7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIHRvZG86IGltcHJvdmUgdHlwaW5nc1xuICAgICAgICAgICAgcHJvZ3JhbS5ncm91cCA9IG91dHJvcztcbiAgICAgICAgICAgIG91dHJvcy5yICs9IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJ1bm5pbmdfcHJvZ3JhbSkge1xuICAgICAgICAgICAgcGVuZGluZ19wcm9ncmFtID0gcHJvZ3JhbTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIGlmIHRoaXMgaXMgYW4gaW50cm8sIGFuZCB0aGVyZSdzIGEgZGVsYXksIHdlIG5lZWQgdG8gZG9cbiAgICAgICAgICAgIC8vIGFuIGluaXRpYWwgdGljayBhbmQvb3IgYXBwbHkgQ1NTIGFuaW1hdGlvbiBpbW1lZGlhdGVseVxuICAgICAgICAgICAgaWYgKGNzcykge1xuICAgICAgICAgICAgICAgIGNsZWFyX2FuaW1hdGlvbigpO1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbl9uYW1lID0gY3JlYXRlX3J1bGUobm9kZSwgdCwgYiwgZHVyYXRpb24sIGRlbGF5LCBlYXNpbmcsIGNzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYilcbiAgICAgICAgICAgICAgICB0aWNrKDAsIDEpO1xuICAgICAgICAgICAgcnVubmluZ19wcm9ncmFtID0gaW5pdChwcm9ncmFtLCBkdXJhdGlvbik7XG4gICAgICAgICAgICBhZGRfcmVuZGVyX2NhbGxiYWNrKCgpID0+IGRpc3BhdGNoKG5vZGUsIGIsICdzdGFydCcpKTtcbiAgICAgICAgICAgIGxvb3Aobm93ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocGVuZGluZ19wcm9ncmFtICYmIG5vdyA+IHBlbmRpbmdfcHJvZ3JhbS5zdGFydCkge1xuICAgICAgICAgICAgICAgICAgICBydW5uaW5nX3Byb2dyYW0gPSBpbml0KHBlbmRpbmdfcHJvZ3JhbSwgZHVyYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nX3Byb2dyYW0gPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBkaXNwYXRjaChub2RlLCBydW5uaW5nX3Byb2dyYW0uYiwgJ3N0YXJ0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyX2FuaW1hdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uX25hbWUgPSBjcmVhdGVfcnVsZShub2RlLCB0LCBydW5uaW5nX3Byb2dyYW0uYiwgcnVubmluZ19wcm9ncmFtLmR1cmF0aW9uLCAwLCBlYXNpbmcsIGNvbmZpZy5jc3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChydW5uaW5nX3Byb2dyYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vdyA+PSBydW5uaW5nX3Byb2dyYW0uZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aWNrKHQgPSBydW5uaW5nX3Byb2dyYW0uYiwgMSAtIHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGF0Y2gobm9kZSwgcnVubmluZ19wcm9ncmFtLmIsICdlbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcGVuZGluZ19wcm9ncmFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UncmUgZG9uZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChydW5uaW5nX3Byb2dyYW0uYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbnRybyDigJQgd2UgY2FuIHRpZHkgdXAgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJfYW5pbWF0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvdXRybyDigJQgbmVlZHMgdG8gYmUgY29vcmRpbmF0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEtLXJ1bm5pbmdfcHJvZ3JhbS5ncm91cC5yKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcnVuX2FsbChydW5uaW5nX3Byb2dyYW0uZ3JvdXAuYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcnVubmluZ19wcm9ncmFtID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChub3cgPj0gcnVubmluZ19wcm9ncmFtLnN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwID0gbm93IC0gcnVubmluZ19wcm9ncmFtLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdCA9IHJ1bm5pbmdfcHJvZ3JhbS5hICsgcnVubmluZ19wcm9ncmFtLmQgKiBlYXNpbmcocCAvIHJ1bm5pbmdfcHJvZ3JhbS5kdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aWNrKHQsIDEgLSB0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gISEocnVubmluZ19wcm9ncmFtIHx8IHBlbmRpbmdfcHJvZ3JhbSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBydW4oYikge1xuICAgICAgICAgICAgaWYgKGlzX2Z1bmN0aW9uKGNvbmZpZykpIHtcbiAgICAgICAgICAgICAgICB3YWl0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnID0gY29uZmlnKCk7XG4gICAgICAgICAgICAgICAgICAgIGdvKGIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZ28oYik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGVuZCgpIHtcbiAgICAgICAgICAgIGNsZWFyX2FuaW1hdGlvbigpO1xuICAgICAgICAgICAgcnVubmluZ19wcm9ncmFtID0gcGVuZGluZ19wcm9ncmFtID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGhhbmRsZV9wcm9taXNlKHByb21pc2UsIGluZm8pIHtcbiAgICBjb25zdCB0b2tlbiA9IGluZm8udG9rZW4gPSB7fTtcbiAgICBmdW5jdGlvbiB1cGRhdGUodHlwZSwgaW5kZXgsIGtleSwgdmFsdWUpIHtcbiAgICAgICAgaWYgKGluZm8udG9rZW4gIT09IHRva2VuKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpbmZvLnJlc29sdmVkID0gdmFsdWU7XG4gICAgICAgIGxldCBjaGlsZF9jdHggPSBpbmZvLmN0eDtcbiAgICAgICAgaWYgKGtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjaGlsZF9jdHggPSBjaGlsZF9jdHguc2xpY2UoKTtcbiAgICAgICAgICAgIGNoaWxkX2N0eFtrZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmxvY2sgPSB0eXBlICYmIChpbmZvLmN1cnJlbnQgPSB0eXBlKShjaGlsZF9jdHgpO1xuICAgICAgICBsZXQgbmVlZHNfZmx1c2ggPSBmYWxzZTtcbiAgICAgICAgaWYgKGluZm8uYmxvY2spIHtcbiAgICAgICAgICAgIGlmIChpbmZvLmJsb2Nrcykge1xuICAgICAgICAgICAgICAgIGluZm8uYmxvY2tzLmZvckVhY2goKGJsb2NrLCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9PSBpbmRleCAmJiBibG9jaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3JvdXBfb3V0cm9zKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uX291dChibG9jaywgMSwgMSwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZm8uYmxvY2tzW2ldID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tfb3V0cm9zKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZm8uYmxvY2suZCgxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJsb2NrLmMoKTtcbiAgICAgICAgICAgIHRyYW5zaXRpb25faW4oYmxvY2ssIDEpO1xuICAgICAgICAgICAgYmxvY2subShpbmZvLm1vdW50KCksIGluZm8uYW5jaG9yKTtcbiAgICAgICAgICAgIG5lZWRzX2ZsdXNoID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpbmZvLmJsb2NrID0gYmxvY2s7XG4gICAgICAgIGlmIChpbmZvLmJsb2NrcylcbiAgICAgICAgICAgIGluZm8uYmxvY2tzW2luZGV4XSA9IGJsb2NrO1xuICAgICAgICBpZiAobmVlZHNfZmx1c2gpIHtcbiAgICAgICAgICAgIGZsdXNoKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzX3Byb21pc2UocHJvbWlzZSkpIHtcbiAgICAgICAgY29uc3QgY3VycmVudF9jb21wb25lbnQgPSBnZXRfY3VycmVudF9jb21wb25lbnQoKTtcbiAgICAgICAgcHJvbWlzZS50aGVuKHZhbHVlID0+IHtcbiAgICAgICAgICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChjdXJyZW50X2NvbXBvbmVudCk7XG4gICAgICAgICAgICB1cGRhdGUoaW5mby50aGVuLCAxLCBpbmZvLnZhbHVlLCB2YWx1ZSk7XG4gICAgICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQobnVsbCk7XG4gICAgICAgIH0sIGVycm9yID0+IHtcbiAgICAgICAgICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChjdXJyZW50X2NvbXBvbmVudCk7XG4gICAgICAgICAgICB1cGRhdGUoaW5mby5jYXRjaCwgMiwgaW5mby5lcnJvciwgZXJyb3IpO1xuICAgICAgICAgICAgc2V0X2N1cnJlbnRfY29tcG9uZW50KG51bGwpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gaWYgd2UgcHJldmlvdXNseSBoYWQgYSB0aGVuL2NhdGNoIGJsb2NrLCBkZXN0cm95IGl0XG4gICAgICAgIGlmIChpbmZvLmN1cnJlbnQgIT09IGluZm8ucGVuZGluZykge1xuICAgICAgICAgICAgdXBkYXRlKGluZm8ucGVuZGluZywgMCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKGluZm8uY3VycmVudCAhPT0gaW5mby50aGVuKSB7XG4gICAgICAgICAgICB1cGRhdGUoaW5mby50aGVuLCAxLCBpbmZvLnZhbHVlLCBwcm9taXNlKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGluZm8ucmVzb2x2ZWQgPSBwcm9taXNlO1xuICAgIH1cbn1cblxuY29uc3QgZ2xvYmFscyA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgID8gd2luZG93XG4gICAgOiB0eXBlb2YgZ2xvYmFsVGhpcyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgPyBnbG9iYWxUaGlzXG4gICAgICAgIDogZ2xvYmFsKTtcblxuZnVuY3Rpb24gZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKSB7XG4gICAgYmxvY2suZCgxKTtcbiAgICBsb29rdXAuZGVsZXRlKGJsb2NrLmtleSk7XG59XG5mdW5jdGlvbiBvdXRyb19hbmRfZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKSB7XG4gICAgdHJhbnNpdGlvbl9vdXQoYmxvY2ssIDEsIDEsICgpID0+IHtcbiAgICAgICAgbG9va3VwLmRlbGV0ZShibG9jay5rZXkpO1xuICAgIH0pO1xufVxuZnVuY3Rpb24gZml4X2FuZF9kZXN0cm95X2Jsb2NrKGJsb2NrLCBsb29rdXApIHtcbiAgICBibG9jay5mKCk7XG4gICAgZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKTtcbn1cbmZ1bmN0aW9uIGZpeF9hbmRfb3V0cm9fYW5kX2Rlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCkge1xuICAgIGJsb2NrLmYoKTtcbiAgICBvdXRyb19hbmRfZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKTtcbn1cbmZ1bmN0aW9uIHVwZGF0ZV9rZXllZF9lYWNoKG9sZF9ibG9ja3MsIGRpcnR5LCBnZXRfa2V5LCBkeW5hbWljLCBjdHgsIGxpc3QsIGxvb2t1cCwgbm9kZSwgZGVzdHJveSwgY3JlYXRlX2VhY2hfYmxvY2ssIG5leHQsIGdldF9jb250ZXh0KSB7XG4gICAgbGV0IG8gPSBvbGRfYmxvY2tzLmxlbmd0aDtcbiAgICBsZXQgbiA9IGxpc3QubGVuZ3RoO1xuICAgIGxldCBpID0gbztcbiAgICBjb25zdCBvbGRfaW5kZXhlcyA9IHt9O1xuICAgIHdoaWxlIChpLS0pXG4gICAgICAgIG9sZF9pbmRleGVzW29sZF9ibG9ja3NbaV0ua2V5XSA9IGk7XG4gICAgY29uc3QgbmV3X2Jsb2NrcyA9IFtdO1xuICAgIGNvbnN0IG5ld19sb29rdXAgPSBuZXcgTWFwKCk7XG4gICAgY29uc3QgZGVsdGFzID0gbmV3IE1hcCgpO1xuICAgIGkgPSBuO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgY29uc3QgY2hpbGRfY3R4ID0gZ2V0X2NvbnRleHQoY3R4LCBsaXN0LCBpKTtcbiAgICAgICAgY29uc3Qga2V5ID0gZ2V0X2tleShjaGlsZF9jdHgpO1xuICAgICAgICBsZXQgYmxvY2sgPSBsb29rdXAuZ2V0KGtleSk7XG4gICAgICAgIGlmICghYmxvY2spIHtcbiAgICAgICAgICAgIGJsb2NrID0gY3JlYXRlX2VhY2hfYmxvY2soa2V5LCBjaGlsZF9jdHgpO1xuICAgICAgICAgICAgYmxvY2suYygpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGR5bmFtaWMpIHtcbiAgICAgICAgICAgIGJsb2NrLnAoY2hpbGRfY3R4LCBkaXJ0eSk7XG4gICAgICAgIH1cbiAgICAgICAgbmV3X2xvb2t1cC5zZXQoa2V5LCBuZXdfYmxvY2tzW2ldID0gYmxvY2spO1xuICAgICAgICBpZiAoa2V5IGluIG9sZF9pbmRleGVzKVxuICAgICAgICAgICAgZGVsdGFzLnNldChrZXksIE1hdGguYWJzKGkgLSBvbGRfaW5kZXhlc1trZXldKSk7XG4gICAgfVxuICAgIGNvbnN0IHdpbGxfbW92ZSA9IG5ldyBTZXQoKTtcbiAgICBjb25zdCBkaWRfbW92ZSA9IG5ldyBTZXQoKTtcbiAgICBmdW5jdGlvbiBpbnNlcnQoYmxvY2spIHtcbiAgICAgICAgdHJhbnNpdGlvbl9pbihibG9jaywgMSk7XG4gICAgICAgIGJsb2NrLm0obm9kZSwgbmV4dCwgbG9va3VwLmhhcyhibG9jay5rZXkpKTtcbiAgICAgICAgbG9va3VwLnNldChibG9jay5rZXksIGJsb2NrKTtcbiAgICAgICAgbmV4dCA9IGJsb2NrLmZpcnN0O1xuICAgICAgICBuLS07XG4gICAgfVxuICAgIHdoaWxlIChvICYmIG4pIHtcbiAgICAgICAgY29uc3QgbmV3X2Jsb2NrID0gbmV3X2Jsb2Nrc1tuIC0gMV07XG4gICAgICAgIGNvbnN0IG9sZF9ibG9jayA9IG9sZF9ibG9ja3NbbyAtIDFdO1xuICAgICAgICBjb25zdCBuZXdfa2V5ID0gbmV3X2Jsb2NrLmtleTtcbiAgICAgICAgY29uc3Qgb2xkX2tleSA9IG9sZF9ibG9jay5rZXk7XG4gICAgICAgIGlmIChuZXdfYmxvY2sgPT09IG9sZF9ibG9jaykge1xuICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgICAgICAgICAgbmV4dCA9IG5ld19ibG9jay5maXJzdDtcbiAgICAgICAgICAgIG8tLTtcbiAgICAgICAgICAgIG4tLTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghbmV3X2xvb2t1cC5oYXMob2xkX2tleSkpIHtcbiAgICAgICAgICAgIC8vIHJlbW92ZSBvbGQgYmxvY2tcbiAgICAgICAgICAgIGRlc3Ryb3kob2xkX2Jsb2NrLCBsb29rdXApO1xuICAgICAgICAgICAgby0tO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFsb29rdXAuaGFzKG5ld19rZXkpIHx8IHdpbGxfbW92ZS5oYXMobmV3X2tleSkpIHtcbiAgICAgICAgICAgIGluc2VydChuZXdfYmxvY2spO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpZF9tb3ZlLmhhcyhvbGRfa2V5KSkge1xuICAgICAgICAgICAgby0tO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRlbHRhcy5nZXQobmV3X2tleSkgPiBkZWx0YXMuZ2V0KG9sZF9rZXkpKSB7XG4gICAgICAgICAgICBkaWRfbW92ZS5hZGQobmV3X2tleSk7XG4gICAgICAgICAgICBpbnNlcnQobmV3X2Jsb2NrKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHdpbGxfbW92ZS5hZGQob2xkX2tleSk7XG4gICAgICAgICAgICBvLS07XG4gICAgICAgIH1cbiAgICB9XG4gICAgd2hpbGUgKG8tLSkge1xuICAgICAgICBjb25zdCBvbGRfYmxvY2sgPSBvbGRfYmxvY2tzW29dO1xuICAgICAgICBpZiAoIW5ld19sb29rdXAuaGFzKG9sZF9ibG9jay5rZXkpKVxuICAgICAgICAgICAgZGVzdHJveShvbGRfYmxvY2ssIGxvb2t1cCk7XG4gICAgfVxuICAgIHdoaWxlIChuKVxuICAgICAgICBpbnNlcnQobmV3X2Jsb2Nrc1tuIC0gMV0pO1xuICAgIHJldHVybiBuZXdfYmxvY2tzO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVfZWFjaF9rZXlzKGN0eCwgbGlzdCwgZ2V0X2NvbnRleHQsIGdldF9rZXkpIHtcbiAgICBjb25zdCBrZXlzID0gbmV3IFNldCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBrZXkgPSBnZXRfa2V5KGdldF9jb250ZXh0KGN0eCwgbGlzdCwgaSkpO1xuICAgICAgICBpZiAoa2V5cy5oYXMoa2V5KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgaGF2ZSBkdXBsaWNhdGUga2V5cyBpbiBhIGtleWVkIGVhY2hgKTtcbiAgICAgICAgfVxuICAgICAgICBrZXlzLmFkZChrZXkpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0X3NwcmVhZF91cGRhdGUobGV2ZWxzLCB1cGRhdGVzKSB7XG4gICAgY29uc3QgdXBkYXRlID0ge307XG4gICAgY29uc3QgdG9fbnVsbF9vdXQgPSB7fTtcbiAgICBjb25zdCBhY2NvdW50ZWRfZm9yID0geyAkJHNjb3BlOiAxIH07XG4gICAgbGV0IGkgPSBsZXZlbHMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgY29uc3QgbyA9IGxldmVsc1tpXTtcbiAgICAgICAgY29uc3QgbiA9IHVwZGF0ZXNbaV07XG4gICAgICAgIGlmIChuKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2V5IGluIG4pKVxuICAgICAgICAgICAgICAgICAgICB0b19udWxsX291dFtrZXldID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIG4pIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFjY291bnRlZF9mb3Jba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVba2V5XSA9IG5ba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudGVkX2ZvcltrZXldID0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXZlbHNbaV0gPSBuO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gbykge1xuICAgICAgICAgICAgICAgIGFjY291bnRlZF9mb3Jba2V5XSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBrZXkgaW4gdG9fbnVsbF9vdXQpIHtcbiAgICAgICAgaWYgKCEoa2V5IGluIHVwZGF0ZSkpXG4gICAgICAgICAgICB1cGRhdGVba2V5XSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHVwZGF0ZTtcbn1cbmZ1bmN0aW9uIGdldF9zcHJlYWRfb2JqZWN0KHNwcmVhZF9wcm9wcykge1xuICAgIHJldHVybiB0eXBlb2Ygc3ByZWFkX3Byb3BzID09PSAnb2JqZWN0JyAmJiBzcHJlYWRfcHJvcHMgIT09IG51bGwgPyBzcHJlYWRfcHJvcHMgOiB7fTtcbn1cblxuLy8gc291cmNlOiBodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9pbmRpY2VzLmh0bWxcbmNvbnN0IGJvb2xlYW5fYXR0cmlidXRlcyA9IG5ldyBTZXQoW1xuICAgICdhbGxvd2Z1bGxzY3JlZW4nLFxuICAgICdhbGxvd3BheW1lbnRyZXF1ZXN0JyxcbiAgICAnYXN5bmMnLFxuICAgICdhdXRvZm9jdXMnLFxuICAgICdhdXRvcGxheScsXG4gICAgJ2NoZWNrZWQnLFxuICAgICdjb250cm9scycsXG4gICAgJ2RlZmF1bHQnLFxuICAgICdkZWZlcicsXG4gICAgJ2Rpc2FibGVkJyxcbiAgICAnZm9ybW5vdmFsaWRhdGUnLFxuICAgICdoaWRkZW4nLFxuICAgICdpc21hcCcsXG4gICAgJ2xvb3AnLFxuICAgICdtdWx0aXBsZScsXG4gICAgJ211dGVkJyxcbiAgICAnbm9tb2R1bGUnLFxuICAgICdub3ZhbGlkYXRlJyxcbiAgICAnb3BlbicsXG4gICAgJ3BsYXlzaW5saW5lJyxcbiAgICAncmVhZG9ubHknLFxuICAgICdyZXF1aXJlZCcsXG4gICAgJ3JldmVyc2VkJyxcbiAgICAnc2VsZWN0ZWQnXG5dKTtcblxuY29uc3QgaW52YWxpZF9hdHRyaWJ1dGVfbmFtZV9jaGFyYWN0ZXIgPSAvW1xccydcIj4vPVxcdXtGREQwfS1cXHV7RkRFRn1cXHV7RkZGRX1cXHV7RkZGRn1cXHV7MUZGRkV9XFx1ezFGRkZGfVxcdXsyRkZGRX1cXHV7MkZGRkZ9XFx1ezNGRkZFfVxcdXszRkZGRn1cXHV7NEZGRkV9XFx1ezRGRkZGfVxcdXs1RkZGRX1cXHV7NUZGRkZ9XFx1ezZGRkZFfVxcdXs2RkZGRn1cXHV7N0ZGRkV9XFx1ezdGRkZGfVxcdXs4RkZGRX1cXHV7OEZGRkZ9XFx1ezlGRkZFfVxcdXs5RkZGRn1cXHV7QUZGRkV9XFx1e0FGRkZGfVxcdXtCRkZGRX1cXHV7QkZGRkZ9XFx1e0NGRkZFfVxcdXtDRkZGRn1cXHV7REZGRkV9XFx1e0RGRkZGfVxcdXtFRkZGRX1cXHV7RUZGRkZ9XFx1e0ZGRkZFfVxcdXtGRkZGRn1cXHV7MTBGRkZFfVxcdXsxMEZGRkZ9XS91O1xuLy8gaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2Uvc3ludGF4Lmh0bWwjYXR0cmlidXRlcy0yXG4vLyBodHRwczovL2luZnJhLnNwZWMud2hhdHdnLm9yZy8jbm9uY2hhcmFjdGVyXG5mdW5jdGlvbiBzcHJlYWQoYXJncywgY2xhc3Nlc190b19hZGQpIHtcbiAgICBjb25zdCBhdHRyaWJ1dGVzID0gT2JqZWN0LmFzc2lnbih7fSwgLi4uYXJncyk7XG4gICAgaWYgKGNsYXNzZXNfdG9fYWRkKSB7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzLmNsYXNzID09IG51bGwpIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMuY2xhc3MgPSBjbGFzc2VzX3RvX2FkZDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMuY2xhc3MgKz0gJyAnICsgY2xhc3Nlc190b19hZGQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGV0IHN0ciA9ICcnO1xuICAgIE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgIGlmIChpbnZhbGlkX2F0dHJpYnV0ZV9uYW1lX2NoYXJhY3Rlci50ZXN0KG5hbWUpKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGF0dHJpYnV0ZXNbbmFtZV07XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdHJ1ZSlcbiAgICAgICAgICAgIHN0ciArPSBcIiBcIiArIG5hbWU7XG4gICAgICAgIGVsc2UgaWYgKGJvb2xlYW5fYXR0cmlidXRlcy5oYXMobmFtZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlKVxuICAgICAgICAgICAgICAgIHN0ciArPSBcIiBcIiArIG5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgc3RyICs9IGAgJHtuYW1lfT1cIiR7U3RyaW5nKHZhbHVlKS5yZXBsYWNlKC9cIi9nLCAnJiMzNDsnKS5yZXBsYWNlKC8nL2csICcmIzM5OycpfVwiYDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzdHI7XG59XG5jb25zdCBlc2NhcGVkID0ge1xuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiMzOTsnLFxuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7J1xufTtcbmZ1bmN0aW9uIGVzY2FwZShodG1sKSB7XG4gICAgcmV0dXJuIFN0cmluZyhodG1sKS5yZXBsYWNlKC9bXCInJjw+XS9nLCBtYXRjaCA9PiBlc2NhcGVkW21hdGNoXSk7XG59XG5mdW5jdGlvbiBlYWNoKGl0ZW1zLCBmbikge1xuICAgIGxldCBzdHIgPSAnJztcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIHN0ciArPSBmbihpdGVtc1tpXSwgaSk7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG5jb25zdCBtaXNzaW5nX2NvbXBvbmVudCA9IHtcbiAgICAkJHJlbmRlcjogKCkgPT4gJydcbn07XG5mdW5jdGlvbiB2YWxpZGF0ZV9jb21wb25lbnQoY29tcG9uZW50LCBuYW1lKSB7XG4gICAgaWYgKCFjb21wb25lbnQgfHwgIWNvbXBvbmVudC4kJHJlbmRlcikge1xuICAgICAgICBpZiAobmFtZSA9PT0gJ3N2ZWx0ZTpjb21wb25lbnQnKVxuICAgICAgICAgICAgbmFtZSArPSAnIHRoaXM9ey4uLn0nO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYDwke25hbWV9PiBpcyBub3QgYSB2YWxpZCBTU1IgY29tcG9uZW50LiBZb3UgbWF5IG5lZWQgdG8gcmV2aWV3IHlvdXIgYnVpbGQgY29uZmlnIHRvIGVuc3VyZSB0aGF0IGRlcGVuZGVuY2llcyBhcmUgY29tcGlsZWQsIHJhdGhlciB0aGFuIGltcG9ydGVkIGFzIHByZS1jb21waWxlZCBtb2R1bGVzYCk7XG4gICAgfVxuICAgIHJldHVybiBjb21wb25lbnQ7XG59XG5mdW5jdGlvbiBkZWJ1ZyhmaWxlLCBsaW5lLCBjb2x1bW4sIHZhbHVlcykge1xuICAgIGNvbnNvbGUubG9nKGB7QGRlYnVnfSAke2ZpbGUgPyBmaWxlICsgJyAnIDogJyd9KCR7bGluZX06JHtjb2x1bW59KWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh2YWx1ZXMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICByZXR1cm4gJyc7XG59XG5sZXQgb25fZGVzdHJveTtcbmZ1bmN0aW9uIGNyZWF0ZV9zc3JfY29tcG9uZW50KGZuKSB7XG4gICAgZnVuY3Rpb24gJCRyZW5kZXIocmVzdWx0LCBwcm9wcywgYmluZGluZ3MsIHNsb3RzKSB7XG4gICAgICAgIGNvbnN0IHBhcmVudF9jb21wb25lbnQgPSBjdXJyZW50X2NvbXBvbmVudDtcbiAgICAgICAgY29uc3QgJCQgPSB7XG4gICAgICAgICAgICBvbl9kZXN0cm95LFxuICAgICAgICAgICAgY29udGV4dDogbmV3IE1hcChwYXJlbnRfY29tcG9uZW50ID8gcGFyZW50X2NvbXBvbmVudC4kJC5jb250ZXh0IDogW10pLFxuICAgICAgICAgICAgLy8gdGhlc2Ugd2lsbCBiZSBpbW1lZGlhdGVseSBkaXNjYXJkZWRcbiAgICAgICAgICAgIG9uX21vdW50OiBbXSxcbiAgICAgICAgICAgIGJlZm9yZV91cGRhdGU6IFtdLFxuICAgICAgICAgICAgYWZ0ZXJfdXBkYXRlOiBbXSxcbiAgICAgICAgICAgIGNhbGxiYWNrczogYmxhbmtfb2JqZWN0KClcbiAgICAgICAgfTtcbiAgICAgICAgc2V0X2N1cnJlbnRfY29tcG9uZW50KHsgJCQgfSk7XG4gICAgICAgIGNvbnN0IGh0bWwgPSBmbihyZXN1bHQsIHByb3BzLCBiaW5kaW5ncywgc2xvdHMpO1xuICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQocGFyZW50X2NvbXBvbmVudCk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICByZW5kZXI6IChwcm9wcyA9IHt9LCBvcHRpb25zID0ge30pID0+IHtcbiAgICAgICAgICAgIG9uX2Rlc3Ryb3kgPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHsgdGl0bGU6ICcnLCBoZWFkOiAnJywgY3NzOiBuZXcgU2V0KCkgfTtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSAkJHJlbmRlcihyZXN1bHQsIHByb3BzLCB7fSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBydW5fYWxsKG9uX2Rlc3Ryb3kpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBodG1sLFxuICAgICAgICAgICAgICAgIGNzczoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBBcnJheS5mcm9tKHJlc3VsdC5jc3MpLm1hcChjc3MgPT4gY3NzLmNvZGUpLmpvaW4oJ1xcbicpLFxuICAgICAgICAgICAgICAgICAgICBtYXA6IG51bGwgLy8gVE9ET1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaGVhZDogcmVzdWx0LnRpdGxlICsgcmVzdWx0LmhlYWRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICAgICQkcmVuZGVyXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGFkZF9hdHRyaWJ1dGUobmFtZSwgdmFsdWUsIGJvb2xlYW4pIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCB8fCAoYm9vbGVhbiAmJiAhdmFsdWUpKVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgcmV0dXJuIGAgJHtuYW1lfSR7dmFsdWUgPT09IHRydWUgPyAnJyA6IGA9JHt0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gSlNPTi5zdHJpbmdpZnkoZXNjYXBlKHZhbHVlKSkgOiBgXCIke3ZhbHVlfVwiYH1gfWA7XG59XG5mdW5jdGlvbiBhZGRfY2xhc3NlcyhjbGFzc2VzKSB7XG4gICAgcmV0dXJuIGNsYXNzZXMgPyBgIGNsYXNzPVwiJHtjbGFzc2VzfVwiYCA6IGBgO1xufVxuXG5mdW5jdGlvbiBiaW5kKGNvbXBvbmVudCwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICBjb25zdCBpbmRleCA9IGNvbXBvbmVudC4kJC5wcm9wc1tuYW1lXTtcbiAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb21wb25lbnQuJCQuYm91bmRbaW5kZXhdID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrKGNvbXBvbmVudC4kJC5jdHhbaW5kZXhdKTtcbiAgICB9XG59XG5mdW5jdGlvbiBjcmVhdGVfY29tcG9uZW50KGJsb2NrKSB7XG4gICAgYmxvY2sgJiYgYmxvY2suYygpO1xufVxuZnVuY3Rpb24gY2xhaW1fY29tcG9uZW50KGJsb2NrLCBwYXJlbnRfbm9kZXMpIHtcbiAgICBibG9jayAmJiBibG9jay5sKHBhcmVudF9ub2Rlcyk7XG59XG5mdW5jdGlvbiBtb3VudF9jb21wb25lbnQoY29tcG9uZW50LCB0YXJnZXQsIGFuY2hvcikge1xuICAgIGNvbnN0IHsgZnJhZ21lbnQsIG9uX21vdW50LCBvbl9kZXN0cm95LCBhZnRlcl91cGRhdGUgfSA9IGNvbXBvbmVudC4kJDtcbiAgICBmcmFnbWVudCAmJiBmcmFnbWVudC5tKHRhcmdldCwgYW5jaG9yKTtcbiAgICAvLyBvbk1vdW50IGhhcHBlbnMgYmVmb3JlIHRoZSBpbml0aWFsIGFmdGVyVXBkYXRlXG4gICAgYWRkX3JlbmRlcl9jYWxsYmFjaygoKSA9PiB7XG4gICAgICAgIGNvbnN0IG5ld19vbl9kZXN0cm95ID0gb25fbW91bnQubWFwKHJ1bikuZmlsdGVyKGlzX2Z1bmN0aW9uKTtcbiAgICAgICAgaWYgKG9uX2Rlc3Ryb3kpIHtcbiAgICAgICAgICAgIG9uX2Rlc3Ryb3kucHVzaCguLi5uZXdfb25fZGVzdHJveSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBFZGdlIGNhc2UgLSBjb21wb25lbnQgd2FzIGRlc3Ryb3llZCBpbW1lZGlhdGVseSxcbiAgICAgICAgICAgIC8vIG1vc3QgbGlrZWx5IGFzIGEgcmVzdWx0IG9mIGEgYmluZGluZyBpbml0aWFsaXNpbmdcbiAgICAgICAgICAgIHJ1bl9hbGwobmV3X29uX2Rlc3Ryb3kpO1xuICAgICAgICB9XG4gICAgICAgIGNvbXBvbmVudC4kJC5vbl9tb3VudCA9IFtdO1xuICAgIH0pO1xuICAgIGFmdGVyX3VwZGF0ZS5mb3JFYWNoKGFkZF9yZW5kZXJfY2FsbGJhY2spO1xufVxuZnVuY3Rpb24gZGVzdHJveV9jb21wb25lbnQoY29tcG9uZW50LCBkZXRhY2hpbmcpIHtcbiAgICBjb25zdCAkJCA9IGNvbXBvbmVudC4kJDtcbiAgICBpZiAoJCQuZnJhZ21lbnQgIT09IG51bGwpIHtcbiAgICAgICAgcnVuX2FsbCgkJC5vbl9kZXN0cm95KTtcbiAgICAgICAgJCQuZnJhZ21lbnQgJiYgJCQuZnJhZ21lbnQuZChkZXRhY2hpbmcpO1xuICAgICAgICAvLyBUT0RPIG51bGwgb3V0IG90aGVyIHJlZnMsIGluY2x1ZGluZyBjb21wb25lbnQuJCQgKGJ1dCBuZWVkIHRvXG4gICAgICAgIC8vIHByZXNlcnZlIGZpbmFsIHN0YXRlPylcbiAgICAgICAgJCQub25fZGVzdHJveSA9ICQkLmZyYWdtZW50ID0gbnVsbDtcbiAgICAgICAgJCQuY3R4ID0gW107XG4gICAgfVxufVxuZnVuY3Rpb24gbWFrZV9kaXJ0eShjb21wb25lbnQsIGkpIHtcbiAgICBpZiAoY29tcG9uZW50LiQkLmRpcnR5WzBdID09PSAtMSkge1xuICAgICAgICBkaXJ0eV9jb21wb25lbnRzLnB1c2goY29tcG9uZW50KTtcbiAgICAgICAgc2NoZWR1bGVfdXBkYXRlKCk7XG4gICAgICAgIGNvbXBvbmVudC4kJC5kaXJ0eS5maWxsKDApO1xuICAgIH1cbiAgICBjb21wb25lbnQuJCQuZGlydHlbKGkgLyAzMSkgfCAwXSB8PSAoMSA8PCAoaSAlIDMxKSk7XG59XG5mdW5jdGlvbiBpbml0KGNvbXBvbmVudCwgb3B0aW9ucywgaW5zdGFuY2UsIGNyZWF0ZV9mcmFnbWVudCwgbm90X2VxdWFsLCBwcm9wcywgZGlydHkgPSBbLTFdKSB7XG4gICAgY29uc3QgcGFyZW50X2NvbXBvbmVudCA9IGN1cnJlbnRfY29tcG9uZW50O1xuICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChjb21wb25lbnQpO1xuICAgIGNvbnN0IHByb3BfdmFsdWVzID0gb3B0aW9ucy5wcm9wcyB8fCB7fTtcbiAgICBjb25zdCAkJCA9IGNvbXBvbmVudC4kJCA9IHtcbiAgICAgICAgZnJhZ21lbnQ6IG51bGwsXG4gICAgICAgIGN0eDogbnVsbCxcbiAgICAgICAgLy8gc3RhdGVcbiAgICAgICAgcHJvcHMsXG4gICAgICAgIHVwZGF0ZTogbm9vcCxcbiAgICAgICAgbm90X2VxdWFsLFxuICAgICAgICBib3VuZDogYmxhbmtfb2JqZWN0KCksXG4gICAgICAgIC8vIGxpZmVjeWNsZVxuICAgICAgICBvbl9tb3VudDogW10sXG4gICAgICAgIG9uX2Rlc3Ryb3k6IFtdLFxuICAgICAgICBiZWZvcmVfdXBkYXRlOiBbXSxcbiAgICAgICAgYWZ0ZXJfdXBkYXRlOiBbXSxcbiAgICAgICAgY29udGV4dDogbmV3IE1hcChwYXJlbnRfY29tcG9uZW50ID8gcGFyZW50X2NvbXBvbmVudC4kJC5jb250ZXh0IDogW10pLFxuICAgICAgICAvLyBldmVyeXRoaW5nIGVsc2VcbiAgICAgICAgY2FsbGJhY2tzOiBibGFua19vYmplY3QoKSxcbiAgICAgICAgZGlydHlcbiAgICB9O1xuICAgIGxldCByZWFkeSA9IGZhbHNlO1xuICAgICQkLmN0eCA9IGluc3RhbmNlXG4gICAgICAgID8gaW5zdGFuY2UoY29tcG9uZW50LCBwcm9wX3ZhbHVlcywgKGksIHJldCwgLi4ucmVzdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSByZXN0Lmxlbmd0aCA/IHJlc3RbMF0gOiByZXQ7XG4gICAgICAgICAgICBpZiAoJCQuY3R4ICYmIG5vdF9lcXVhbCgkJC5jdHhbaV0sICQkLmN0eFtpXSA9IHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGlmICgkJC5ib3VuZFtpXSlcbiAgICAgICAgICAgICAgICAgICAgJCQuYm91bmRbaV0odmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChyZWFkeSlcbiAgICAgICAgICAgICAgICAgICAgbWFrZV9kaXJ0eShjb21wb25lbnQsIGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfSlcbiAgICAgICAgOiBbXTtcbiAgICAkJC51cGRhdGUoKTtcbiAgICByZWFkeSA9IHRydWU7XG4gICAgcnVuX2FsbCgkJC5iZWZvcmVfdXBkYXRlKTtcbiAgICAvLyBgZmFsc2VgIGFzIGEgc3BlY2lhbCBjYXNlIG9mIG5vIERPTSBjb21wb25lbnRcbiAgICAkJC5mcmFnbWVudCA9IGNyZWF0ZV9mcmFnbWVudCA/IGNyZWF0ZV9mcmFnbWVudCgkJC5jdHgpIDogZmFsc2U7XG4gICAgaWYgKG9wdGlvbnMudGFyZ2V0KSB7XG4gICAgICAgIGlmIChvcHRpb25zLmh5ZHJhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGVzID0gY2hpbGRyZW4ob3B0aW9ucy50YXJnZXQpO1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICQkLmZyYWdtZW50ICYmICQkLmZyYWdtZW50Lmwobm9kZXMpO1xuICAgICAgICAgICAgbm9kZXMuZm9yRWFjaChkZXRhY2gpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICQkLmZyYWdtZW50ICYmICQkLmZyYWdtZW50LmMoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5pbnRybylcbiAgICAgICAgICAgIHRyYW5zaXRpb25faW4oY29tcG9uZW50LiQkLmZyYWdtZW50KTtcbiAgICAgICAgbW91bnRfY29tcG9uZW50KGNvbXBvbmVudCwgb3B0aW9ucy50YXJnZXQsIG9wdGlvbnMuYW5jaG9yKTtcbiAgICAgICAgZmx1c2goKTtcbiAgICB9XG4gICAgc2V0X2N1cnJlbnRfY29tcG9uZW50KHBhcmVudF9jb21wb25lbnQpO1xufVxubGV0IFN2ZWx0ZUVsZW1lbnQ7XG5pZiAodHlwZW9mIEhUTUxFbGVtZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgU3ZlbHRlRWxlbWVudCA9IGNsYXNzIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIHN1cGVyKCk7XG4gICAgICAgICAgICB0aGlzLmF0dGFjaFNoYWRvdyh7IG1vZGU6ICdvcGVuJyB9KTtcbiAgICAgICAgfVxuICAgICAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgdG9kbzogaW1wcm92ZSB0eXBpbmdzXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzLiQkLnNsb3R0ZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlIHRvZG86IGltcHJvdmUgdHlwaW5nc1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kQ2hpbGQodGhpcy4kJC5zbG90dGVkW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhhdHRyLCBfb2xkVmFsdWUsIG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzW2F0dHJdID0gbmV3VmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgJGRlc3Ryb3koKSB7XG4gICAgICAgICAgICBkZXN0cm95X2NvbXBvbmVudCh0aGlzLCAxKTtcbiAgICAgICAgICAgIHRoaXMuJGRlc3Ryb3kgPSBub29wO1xuICAgICAgICB9XG4gICAgICAgICRvbih0eXBlLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gVE9ETyBzaG91bGQgdGhpcyBkZWxlZ2F0ZSB0byBhZGRFdmVudExpc3RlbmVyP1xuICAgICAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gKHRoaXMuJCQuY2FsbGJhY2tzW3R5cGVdIHx8ICh0aGlzLiQkLmNhbGxiYWNrc1t0eXBlXSA9IFtdKSk7XG4gICAgICAgICAgICBjYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gY2FsbGJhY2tzLmluZGV4T2YoY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICAkc2V0KCkge1xuICAgICAgICAgICAgLy8gb3ZlcnJpZGRlbiBieSBpbnN0YW5jZSwgaWYgaXQgaGFzIHByb3BzXG4gICAgICAgIH1cbiAgICB9O1xufVxuY2xhc3MgU3ZlbHRlQ29tcG9uZW50IHtcbiAgICAkZGVzdHJveSgpIHtcbiAgICAgICAgZGVzdHJveV9jb21wb25lbnQodGhpcywgMSk7XG4gICAgICAgIHRoaXMuJGRlc3Ryb3kgPSBub29wO1xuICAgIH1cbiAgICAkb24odHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gKHRoaXMuJCQuY2FsbGJhY2tzW3R5cGVdIHx8ICh0aGlzLiQkLmNhbGxiYWNrc1t0eXBlXSA9IFtdKSk7XG4gICAgICAgIGNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gY2FsbGJhY2tzLmluZGV4T2YoY2FsbGJhY2spO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSlcbiAgICAgICAgICAgICAgICBjYWxsYmFja3Muc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgJHNldCgpIHtcbiAgICAgICAgLy8gb3ZlcnJpZGRlbiBieSBpbnN0YW5jZSwgaWYgaXQgaGFzIHByb3BzXG4gICAgfVxufVxuXG5mdW5jdGlvbiBkaXNwYXRjaF9kZXYodHlwZSwgZGV0YWlsKSB7XG4gICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChjdXN0b21fZXZlbnQodHlwZSwgT2JqZWN0LmFzc2lnbih7IHZlcnNpb246ICczLjIyLjInIH0sIGRldGFpbCkpKTtcbn1cbmZ1bmN0aW9uIGFwcGVuZF9kZXYodGFyZ2V0LCBub2RlKSB7XG4gICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NSW5zZXJ0XCIsIHsgdGFyZ2V0LCBub2RlIH0pO1xuICAgIGFwcGVuZCh0YXJnZXQsIG5vZGUpO1xufVxuZnVuY3Rpb24gaW5zZXJ0X2Rldih0YXJnZXQsIG5vZGUsIGFuY2hvcikge1xuICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTUluc2VydFwiLCB7IHRhcmdldCwgbm9kZSwgYW5jaG9yIH0pO1xuICAgIGluc2VydCh0YXJnZXQsIG5vZGUsIGFuY2hvcik7XG59XG5mdW5jdGlvbiBkZXRhY2hfZGV2KG5vZGUpIHtcbiAgICBkaXNwYXRjaF9kZXYoXCJTdmVsdGVET01SZW1vdmVcIiwgeyBub2RlIH0pO1xuICAgIGRldGFjaChub2RlKTtcbn1cbmZ1bmN0aW9uIGRldGFjaF9iZXR3ZWVuX2RldihiZWZvcmUsIGFmdGVyKSB7XG4gICAgd2hpbGUgKGJlZm9yZS5uZXh0U2libGluZyAmJiBiZWZvcmUubmV4dFNpYmxpbmcgIT09IGFmdGVyKSB7XG4gICAgICAgIGRldGFjaF9kZXYoYmVmb3JlLm5leHRTaWJsaW5nKTtcbiAgICB9XG59XG5mdW5jdGlvbiBkZXRhY2hfYmVmb3JlX2RldihhZnRlcikge1xuICAgIHdoaWxlIChhZnRlci5wcmV2aW91c1NpYmxpbmcpIHtcbiAgICAgICAgZGV0YWNoX2RldihhZnRlci5wcmV2aW91c1NpYmxpbmcpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGRldGFjaF9hZnRlcl9kZXYoYmVmb3JlKSB7XG4gICAgd2hpbGUgKGJlZm9yZS5uZXh0U2libGluZykge1xuICAgICAgICBkZXRhY2hfZGV2KGJlZm9yZS5uZXh0U2libGluZyk7XG4gICAgfVxufVxuZnVuY3Rpb24gbGlzdGVuX2Rldihub2RlLCBldmVudCwgaGFuZGxlciwgb3B0aW9ucywgaGFzX3ByZXZlbnRfZGVmYXVsdCwgaGFzX3N0b3BfcHJvcGFnYXRpb24pIHtcbiAgICBjb25zdCBtb2RpZmllcnMgPSBvcHRpb25zID09PSB0cnVlID8gW1wiY2FwdHVyZVwiXSA6IG9wdGlvbnMgPyBBcnJheS5mcm9tKE9iamVjdC5rZXlzKG9wdGlvbnMpKSA6IFtdO1xuICAgIGlmIChoYXNfcHJldmVudF9kZWZhdWx0KVxuICAgICAgICBtb2RpZmllcnMucHVzaCgncHJldmVudERlZmF1bHQnKTtcbiAgICBpZiAoaGFzX3N0b3BfcHJvcGFnYXRpb24pXG4gICAgICAgIG1vZGlmaWVycy5wdXNoKCdzdG9wUHJvcGFnYXRpb24nKTtcbiAgICBkaXNwYXRjaF9kZXYoXCJTdmVsdGVET01BZGRFdmVudExpc3RlbmVyXCIsIHsgbm9kZSwgZXZlbnQsIGhhbmRsZXIsIG1vZGlmaWVycyB9KTtcbiAgICBjb25zdCBkaXNwb3NlID0gbGlzdGVuKG5vZGUsIGV2ZW50LCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBkaXNwYXRjaF9kZXYoXCJTdmVsdGVET01SZW1vdmVFdmVudExpc3RlbmVyXCIsIHsgbm9kZSwgZXZlbnQsIGhhbmRsZXIsIG1vZGlmaWVycyB9KTtcbiAgICAgICAgZGlzcG9zZSgpO1xuICAgIH07XG59XG5mdW5jdGlvbiBhdHRyX2Rldihub2RlLCBhdHRyaWJ1dGUsIHZhbHVlKSB7XG4gICAgYXR0cihub2RlLCBhdHRyaWJ1dGUsIHZhbHVlKTtcbiAgICBpZiAodmFsdWUgPT0gbnVsbClcbiAgICAgICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NUmVtb3ZlQXR0cmlidXRlXCIsIHsgbm9kZSwgYXR0cmlidXRlIH0pO1xuICAgIGVsc2VcbiAgICAgICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NU2V0QXR0cmlidXRlXCIsIHsgbm9kZSwgYXR0cmlidXRlLCB2YWx1ZSB9KTtcbn1cbmZ1bmN0aW9uIHByb3BfZGV2KG5vZGUsIHByb3BlcnR5LCB2YWx1ZSkge1xuICAgIG5vZGVbcHJvcGVydHldID0gdmFsdWU7XG4gICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NU2V0UHJvcGVydHlcIiwgeyBub2RlLCBwcm9wZXJ0eSwgdmFsdWUgfSk7XG59XG5mdW5jdGlvbiBkYXRhc2V0X2Rldihub2RlLCBwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICBub2RlLmRhdGFzZXRbcHJvcGVydHldID0gdmFsdWU7XG4gICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NU2V0RGF0YXNldFwiLCB7IG5vZGUsIHByb3BlcnR5LCB2YWx1ZSB9KTtcbn1cbmZ1bmN0aW9uIHNldF9kYXRhX2Rldih0ZXh0LCBkYXRhKSB7XG4gICAgZGF0YSA9ICcnICsgZGF0YTtcbiAgICBpZiAodGV4dC5kYXRhID09PSBkYXRhKVxuICAgICAgICByZXR1cm47XG4gICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NU2V0RGF0YVwiLCB7IG5vZGU6IHRleHQsIGRhdGEgfSk7XG4gICAgdGV4dC5kYXRhID0gZGF0YTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlX2VhY2hfYXJndW1lbnQoYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdzdHJpbmcnICYmICEoYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmICdsZW5ndGgnIGluIGFyZykpIHtcbiAgICAgICAgbGV0IG1zZyA9ICd7I2VhY2h9IG9ubHkgaXRlcmF0ZXMgb3ZlciBhcnJheS1saWtlIG9iamVjdHMuJztcbiAgICAgICAgaWYgKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgYXJnICYmIFN5bWJvbC5pdGVyYXRvciBpbiBhcmcpIHtcbiAgICAgICAgICAgIG1zZyArPSAnIFlvdSBjYW4gdXNlIGEgc3ByZWFkIHRvIGNvbnZlcnQgdGhpcyBpdGVyYWJsZSBpbnRvIGFuIGFycmF5Lic7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgfVxufVxuZnVuY3Rpb24gdmFsaWRhdGVfc2xvdHMobmFtZSwgc2xvdCwga2V5cykge1xuICAgIGZvciAoY29uc3Qgc2xvdF9rZXkgb2YgT2JqZWN0LmtleXMoc2xvdCkpIHtcbiAgICAgICAgaWYgKCF+a2V5cy5pbmRleE9mKHNsb3Rfa2V5KSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGA8JHtuYW1lfT4gcmVjZWl2ZWQgYW4gdW5leHBlY3RlZCBzbG90IFwiJHtzbG90X2tleX1cIi5gKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmNsYXNzIFN2ZWx0ZUNvbXBvbmVudERldiBleHRlbmRzIFN2ZWx0ZUNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgICAgICBpZiAoIW9wdGlvbnMgfHwgKCFvcHRpb25zLnRhcmdldCAmJiAhb3B0aW9ucy4kJGlubGluZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJ3RhcmdldCcgaXMgYSByZXF1aXJlZCBvcHRpb25gKTtcbiAgICAgICAgfVxuICAgICAgICBzdXBlcigpO1xuICAgIH1cbiAgICAkZGVzdHJveSgpIHtcbiAgICAgICAgc3VwZXIuJGRlc3Ryb3koKTtcbiAgICAgICAgdGhpcy4kZGVzdHJveSA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQ29tcG9uZW50IHdhcyBhbHJlYWR5IGRlc3Ryb3llZGApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgfTtcbiAgICB9XG4gICAgJGNhcHR1cmVfc3RhdGUoKSB7IH1cbiAgICAkaW5qZWN0X3N0YXRlKCkgeyB9XG59XG5mdW5jdGlvbiBsb29wX2d1YXJkKHRpbWVvdXQpIHtcbiAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgaWYgKERhdGUubm93KCkgLSBzdGFydCA+IHRpbWVvdXQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW5maW5pdGUgbG9vcCBkZXRlY3RlZGApO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuZXhwb3J0IHsgSHRtbFRhZywgU3ZlbHRlQ29tcG9uZW50LCBTdmVsdGVDb21wb25lbnREZXYsIFN2ZWx0ZUVsZW1lbnQsIGFjdGlvbl9kZXN0cm95ZXIsIGFkZF9hdHRyaWJ1dGUsIGFkZF9jbGFzc2VzLCBhZGRfZmx1c2hfY2FsbGJhY2ssIGFkZF9sb2NhdGlvbiwgYWRkX3JlbmRlcl9jYWxsYmFjaywgYWRkX3Jlc2l6ZV9saXN0ZW5lciwgYWRkX3RyYW5zZm9ybSwgYWZ0ZXJVcGRhdGUsIGFwcGVuZCwgYXBwZW5kX2RldiwgYXNzaWduLCBhdHRyLCBhdHRyX2RldiwgYmVmb3JlVXBkYXRlLCBiaW5kLCBiaW5kaW5nX2NhbGxiYWNrcywgYmxhbmtfb2JqZWN0LCBidWJibGUsIGNoZWNrX291dHJvcywgY2hpbGRyZW4sIGNsYWltX2NvbXBvbmVudCwgY2xhaW1fZWxlbWVudCwgY2xhaW1fc3BhY2UsIGNsYWltX3RleHQsIGNsZWFyX2xvb3BzLCBjb21wb25lbnRfc3Vic2NyaWJlLCBjb21wdXRlX3Jlc3RfcHJvcHMsIGNyZWF0ZUV2ZW50RGlzcGF0Y2hlciwgY3JlYXRlX2FuaW1hdGlvbiwgY3JlYXRlX2JpZGlyZWN0aW9uYWxfdHJhbnNpdGlvbiwgY3JlYXRlX2NvbXBvbmVudCwgY3JlYXRlX2luX3RyYW5zaXRpb24sIGNyZWF0ZV9vdXRfdHJhbnNpdGlvbiwgY3JlYXRlX3Nsb3QsIGNyZWF0ZV9zc3JfY29tcG9uZW50LCBjdXJyZW50X2NvbXBvbmVudCwgY3VzdG9tX2V2ZW50LCBkYXRhc2V0X2RldiwgZGVidWcsIGRlc3Ryb3lfYmxvY2ssIGRlc3Ryb3lfY29tcG9uZW50LCBkZXN0cm95X2VhY2gsIGRldGFjaCwgZGV0YWNoX2FmdGVyX2RldiwgZGV0YWNoX2JlZm9yZV9kZXYsIGRldGFjaF9iZXR3ZWVuX2RldiwgZGV0YWNoX2RldiwgZGlydHlfY29tcG9uZW50cywgZGlzcGF0Y2hfZGV2LCBlYWNoLCBlbGVtZW50LCBlbGVtZW50X2lzLCBlbXB0eSwgZXNjYXBlLCBlc2NhcGVkLCBleGNsdWRlX2ludGVybmFsX3Byb3BzLCBmaXhfYW5kX2Rlc3Ryb3lfYmxvY2ssIGZpeF9hbmRfb3V0cm9fYW5kX2Rlc3Ryb3lfYmxvY2ssIGZpeF9wb3NpdGlvbiwgZmx1c2gsIGdldENvbnRleHQsIGdldF9iaW5kaW5nX2dyb3VwX3ZhbHVlLCBnZXRfY3VycmVudF9jb21wb25lbnQsIGdldF9zbG90X2NoYW5nZXMsIGdldF9zbG90X2NvbnRleHQsIGdldF9zcHJlYWRfb2JqZWN0LCBnZXRfc3ByZWFkX3VwZGF0ZSwgZ2V0X3N0b3JlX3ZhbHVlLCBnbG9iYWxzLCBncm91cF9vdXRyb3MsIGhhbmRsZV9wcm9taXNlLCBoYXNfcHJvcCwgaWRlbnRpdHksIGluaXQsIGluc2VydCwgaW5zZXJ0X2RldiwgaW50cm9zLCBpbnZhbGlkX2F0dHJpYnV0ZV9uYW1lX2NoYXJhY3RlciwgaXNfY2xpZW50LCBpc19jcm9zc29yaWdpbiwgaXNfZnVuY3Rpb24sIGlzX3Byb21pc2UsIGxpc3RlbiwgbGlzdGVuX2RldiwgbG9vcCwgbG9vcF9ndWFyZCwgbWlzc2luZ19jb21wb25lbnQsIG1vdW50X2NvbXBvbmVudCwgbm9vcCwgbm90X2VxdWFsLCBub3csIG51bGxfdG9fZW1wdHksIG9iamVjdF93aXRob3V0X3Byb3BlcnRpZXMsIG9uRGVzdHJveSwgb25Nb3VudCwgb25jZSwgb3V0cm9fYW5kX2Rlc3Ryb3lfYmxvY2ssIHByZXZlbnRfZGVmYXVsdCwgcHJvcF9kZXYsIHF1ZXJ5X3NlbGVjdG9yX2FsbCwgcmFmLCBydW4sIHJ1bl9hbGwsIHNhZmVfbm90X2VxdWFsLCBzY2hlZHVsZV91cGRhdGUsIHNlbGVjdF9tdWx0aXBsZV92YWx1ZSwgc2VsZWN0X29wdGlvbiwgc2VsZWN0X29wdGlvbnMsIHNlbGVjdF92YWx1ZSwgc2VsZiwgc2V0Q29udGV4dCwgc2V0X2F0dHJpYnV0ZXMsIHNldF9jdXJyZW50X2NvbXBvbmVudCwgc2V0X2N1c3RvbV9lbGVtZW50X2RhdGEsIHNldF9kYXRhLCBzZXRfZGF0YV9kZXYsIHNldF9pbnB1dF90eXBlLCBzZXRfaW5wdXRfdmFsdWUsIHNldF9ub3csIHNldF9yYWYsIHNldF9zdG9yZV92YWx1ZSwgc2V0X3N0eWxlLCBzZXRfc3ZnX2F0dHJpYnV0ZXMsIHNwYWNlLCBzcHJlYWQsIHN0b3BfcHJvcGFnYXRpb24sIHN1YnNjcmliZSwgc3ZnX2VsZW1lbnQsIHRleHQsIHRpY2ssIHRpbWVfcmFuZ2VzX3RvX2FycmF5LCB0b19udW1iZXIsIHRvZ2dsZV9jbGFzcywgdHJhbnNpdGlvbl9pbiwgdHJhbnNpdGlvbl9vdXQsIHVwZGF0ZV9rZXllZF9lYWNoLCB2YWxpZGF0ZV9jb21wb25lbnQsIHZhbGlkYXRlX2VhY2hfYXJndW1lbnQsIHZhbGlkYXRlX2VhY2hfa2V5cywgdmFsaWRhdGVfc2xvdHMsIHZhbGlkYXRlX3N0b3JlLCB4bGlua19hdHRyIH07XG4iLCJpbXBvcnQgeyBub29wLCBzYWZlX25vdF9lcXVhbCwgc3Vic2NyaWJlLCBydW5fYWxsLCBpc19mdW5jdGlvbiB9IGZyb20gJy4uL2ludGVybmFsJztcbmV4cG9ydCB7IGdldF9zdG9yZV92YWx1ZSBhcyBnZXQgfSBmcm9tICcuLi9pbnRlcm5hbCc7XG5cbmNvbnN0IHN1YnNjcmliZXJfcXVldWUgPSBbXTtcbi8qKlxuICogQ3JlYXRlcyBhIGBSZWFkYWJsZWAgc3RvcmUgdGhhdCBhbGxvd3MgcmVhZGluZyBieSBzdWJzY3JpcHRpb24uXG4gKiBAcGFyYW0gdmFsdWUgaW5pdGlhbCB2YWx1ZVxuICogQHBhcmFtIHtTdGFydFN0b3BOb3RpZmllcn1zdGFydCBzdGFydCBhbmQgc3RvcCBub3RpZmljYXRpb25zIGZvciBzdWJzY3JpcHRpb25zXG4gKi9cbmZ1bmN0aW9uIHJlYWRhYmxlKHZhbHVlLCBzdGFydCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHN1YnNjcmliZTogd3JpdGFibGUodmFsdWUsIHN0YXJ0KS5zdWJzY3JpYmUsXG4gICAgfTtcbn1cbi8qKlxuICogQ3JlYXRlIGEgYFdyaXRhYmxlYCBzdG9yZSB0aGF0IGFsbG93cyBib3RoIHVwZGF0aW5nIGFuZCByZWFkaW5nIGJ5IHN1YnNjcmlwdGlvbi5cbiAqIEBwYXJhbSB7Kj19dmFsdWUgaW5pdGlhbCB2YWx1ZVxuICogQHBhcmFtIHtTdGFydFN0b3BOb3RpZmllcj19c3RhcnQgc3RhcnQgYW5kIHN0b3Agbm90aWZpY2F0aW9ucyBmb3Igc3Vic2NyaXB0aW9uc1xuICovXG5mdW5jdGlvbiB3cml0YWJsZSh2YWx1ZSwgc3RhcnQgPSBub29wKSB7XG4gICAgbGV0IHN0b3A7XG4gICAgY29uc3Qgc3Vic2NyaWJlcnMgPSBbXTtcbiAgICBmdW5jdGlvbiBzZXQobmV3X3ZhbHVlKSB7XG4gICAgICAgIGlmIChzYWZlX25vdF9lcXVhbCh2YWx1ZSwgbmV3X3ZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSBuZXdfdmFsdWU7XG4gICAgICAgICAgICBpZiAoc3RvcCkgeyAvLyBzdG9yZSBpcyByZWFkeVxuICAgICAgICAgICAgICAgIGNvbnN0IHJ1bl9xdWV1ZSA9ICFzdWJzY3JpYmVyX3F1ZXVlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgc1sxXSgpO1xuICAgICAgICAgICAgICAgICAgICBzdWJzY3JpYmVyX3F1ZXVlLnB1c2gocywgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocnVuX3F1ZXVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3Vic2NyaWJlcl9xdWV1ZS5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3Vic2NyaWJlcl9xdWV1ZVtpXVswXShzdWJzY3JpYmVyX3F1ZXVlW2kgKyAxXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3Vic2NyaWJlcl9xdWV1ZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiB1cGRhdGUoZm4pIHtcbiAgICAgICAgc2V0KGZuKHZhbHVlKSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHN1YnNjcmliZShydW4sIGludmFsaWRhdGUgPSBub29wKSB7XG4gICAgICAgIGNvbnN0IHN1YnNjcmliZXIgPSBbcnVuLCBpbnZhbGlkYXRlXTtcbiAgICAgICAgc3Vic2NyaWJlcnMucHVzaChzdWJzY3JpYmVyKTtcbiAgICAgICAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgc3RvcCA9IHN0YXJ0KHNldCkgfHwgbm9vcDtcbiAgICAgICAgfVxuICAgICAgICBydW4odmFsdWUpO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBzdWJzY3JpYmVycy5pbmRleE9mKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgc3RvcCgpO1xuICAgICAgICAgICAgICAgIHN0b3AgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4geyBzZXQsIHVwZGF0ZSwgc3Vic2NyaWJlIH07XG59XG5mdW5jdGlvbiBkZXJpdmVkKHN0b3JlcywgZm4sIGluaXRpYWxfdmFsdWUpIHtcbiAgICBjb25zdCBzaW5nbGUgPSAhQXJyYXkuaXNBcnJheShzdG9yZXMpO1xuICAgIGNvbnN0IHN0b3Jlc19hcnJheSA9IHNpbmdsZVxuICAgICAgICA/IFtzdG9yZXNdXG4gICAgICAgIDogc3RvcmVzO1xuICAgIGNvbnN0IGF1dG8gPSBmbi5sZW5ndGggPCAyO1xuICAgIHJldHVybiByZWFkYWJsZShpbml0aWFsX3ZhbHVlLCAoc2V0KSA9PiB7XG4gICAgICAgIGxldCBpbml0ZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gW107XG4gICAgICAgIGxldCBwZW5kaW5nID0gMDtcbiAgICAgICAgbGV0IGNsZWFudXAgPSBub29wO1xuICAgICAgICBjb25zdCBzeW5jID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHBlbmRpbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBmbihzaW5nbGUgPyB2YWx1ZXNbMF0gOiB2YWx1ZXMsIHNldCk7XG4gICAgICAgICAgICBpZiAoYXV0bykge1xuICAgICAgICAgICAgICAgIHNldChyZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2xlYW51cCA9IGlzX2Z1bmN0aW9uKHJlc3VsdCkgPyByZXN1bHQgOiBub29wO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCB1bnN1YnNjcmliZXJzID0gc3RvcmVzX2FycmF5Lm1hcCgoc3RvcmUsIGkpID0+IHN1YnNjcmliZShzdG9yZSwgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB2YWx1ZXNbaV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIHBlbmRpbmcgJj0gfigxIDw8IGkpO1xuICAgICAgICAgICAgaWYgKGluaXRlZCkge1xuICAgICAgICAgICAgICAgIHN5bmMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgKCkgPT4ge1xuICAgICAgICAgICAgcGVuZGluZyB8PSAoMSA8PCBpKTtcbiAgICAgICAgfSkpO1xuICAgICAgICBpbml0ZWQgPSB0cnVlO1xuICAgICAgICBzeW5jKCk7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBzdG9wKCkge1xuICAgICAgICAgICAgcnVuX2FsbCh1bnN1YnNjcmliZXJzKTtcbiAgICAgICAgICAgIGNsZWFudXAoKTtcbiAgICAgICAgfTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IHsgZGVyaXZlZCwgcmVhZGFibGUsIHdyaXRhYmxlIH07XG4iLCJpbXBvcnQgeyB3cml0YWJsZSB9IGZyb20gJ3N2ZWx0ZS9zdG9yZSc7XG5cbmV4cG9ydCBjb25zdCBDT05URVhUX0tFWSA9IHt9O1xuXG5leHBvcnQgY29uc3QgcHJlbG9hZCA9ICgpID0+ICh7fSk7IiwiPHNjcmlwdD5cblx0ZXhwb3J0IGxldCBlcnJvcjtcblx0ZXhwb3J0IGxldCBzdGF0dXM7XG48L3NjcmlwdD5cblxuPGgxPntzdGF0dXN9PC9oMT5cblxuPHA+e2Vycm9yLm1lc3NhZ2V9PC9wPlxuXG57I2lmIHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnfVxuXHQ8cHJlPntlcnJvci5zdGFja308L3ByZT5cbnsvaWZ9IiwiPCEtLSBUaGlzIGZpbGUgaXMgZ2VuZXJhdGVkIGJ5IFNhcHBlciDigJQgZG8gbm90IGVkaXQgaXQhIC0tPlxuPHNjcmlwdD5cblx0aW1wb3J0IHsgc2V0Q29udGV4dCwgYWZ0ZXJVcGRhdGUgfSBmcm9tICdzdmVsdGUnO1xuXHRpbXBvcnQgeyBDT05URVhUX0tFWSB9IGZyb20gJy4vc2hhcmVkJztcblx0aW1wb3J0IExheW91dCBmcm9tICcuLi8uLi8uLi9yb3V0ZXMvX2xheW91dC5zdmVsdGUnO1xuXHRpbXBvcnQgRXJyb3IgZnJvbSAnLi9lcnJvci5zdmVsdGUnO1xuXG5cdGV4cG9ydCBsZXQgc3RvcmVzO1xuXHRleHBvcnQgbGV0IGVycm9yO1xuXHRleHBvcnQgbGV0IHN0YXR1cztcblx0ZXhwb3J0IGxldCBzZWdtZW50cztcblx0ZXhwb3J0IGxldCBsZXZlbDA7XG5cdGV4cG9ydCBsZXQgbGV2ZWwxID0gbnVsbDtcblx0ZXhwb3J0IGxldCBub3RpZnk7XG5cblx0YWZ0ZXJVcGRhdGUobm90aWZ5KTtcblx0c2V0Q29udGV4dChDT05URVhUX0tFWSwgc3RvcmVzKTtcbjwvc2NyaXB0PlxuXG48TGF5b3V0IHNlZ21lbnQ9XCJ7c2VnbWVudHNbMF19XCIgey4uLmxldmVsMC5wcm9wc30+XG5cdHsjaWYgZXJyb3J9XG5cdFx0PEVycm9yIHtlcnJvcn0ge3N0YXR1c30vPlxuXHR7OmVsc2V9XG5cdFx0PHN2ZWx0ZTpjb21wb25lbnQgdGhpcz1cIntsZXZlbDEuY29tcG9uZW50fVwiIHsuLi5sZXZlbDEucHJvcHN9Lz5cblx0ey9pZn1cbjwvTGF5b3V0PiIsIi8vIFRoaXMgZmlsZSBpcyBnZW5lcmF0ZWQgYnkgU2FwcGVyIOKAlCBkbyBub3QgZWRpdCBpdCFcbmV4cG9ydCB7IGRlZmF1bHQgYXMgUm9vdCB9IGZyb20gJy4uLy4uLy4uL3JvdXRlcy9fbGF5b3V0LnN2ZWx0ZSc7XG5leHBvcnQgeyBwcmVsb2FkIGFzIHJvb3RfcHJlbG9hZCB9IGZyb20gJy4vc2hhcmVkJztcbmV4cG9ydCB7IGRlZmF1bHQgYXMgRXJyb3JDb21wb25lbnQgfSBmcm9tICcuL2Vycm9yLnN2ZWx0ZSc7XG5cbmV4cG9ydCBjb25zdCBpZ25vcmUgPSBbXTtcblxuZXhwb3J0IGNvbnN0IGNvbXBvbmVudHMgPSBbXG5cdHtcblx0XHRqczogKCkgPT4gaW1wb3J0KFwiLi4vLi4vLi4vcm91dGVzL2luZGV4LnN2ZWx0ZVwiKSxcblx0XHRjc3M6IFwiX19TQVBQRVJfQ1NTX1BMQUNFSE9MREVSOmluZGV4LnN2ZWx0ZV9fXCJcblx0fVxuXTtcblxuZXhwb3J0IGNvbnN0IHJvdXRlcyA9IFtcblx0e1xuXHRcdC8vIGluZGV4LnN2ZWx0ZVxuXHRcdHBhdHRlcm46IC9eXFwvJC8sXG5cdFx0cGFydHM6IFtcblx0XHRcdHsgaTogMCB9XG5cdFx0XVxuXHR9XG5dO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0aW1wb3J0KFwiL2hvbWUvanVpaXB1cC/QoNCw0LHQvtGH0LjQuSDRgdGC0L7Quy9XYXZlZXMvc2VydmljZXMvdHVubmVscy9ub2RlX21vZHVsZXMvc2FwcGVyL3NhcHBlci1kZXYtY2xpZW50LmpzXCIpLnRoZW4oY2xpZW50ID0+IHtcblx0XHRjbGllbnQuY29ubmVjdCgxMDAwMCk7XG5cdH0pO1xufSIsImltcG9ydCB7IGdldENvbnRleHQgfSBmcm9tICdzdmVsdGUnO1xuaW1wb3J0IHsgQ09OVEVYVF9LRVkgfSBmcm9tICcuL2ludGVybmFsL3NoYXJlZCc7XG5pbXBvcnQgeyB3cml0YWJsZSB9IGZyb20gJ3N2ZWx0ZS9zdG9yZSc7XG5pbXBvcnQgQXBwIGZyb20gJy4vaW50ZXJuYWwvQXBwLnN2ZWx0ZSc7XG5pbXBvcnQgeyBpZ25vcmUsIHJvdXRlcywgcm9vdF9wcmVsb2FkLCBjb21wb25lbnRzLCBFcnJvckNvbXBvbmVudCB9IGZyb20gJy4vaW50ZXJuYWwvbWFuaWZlc3QtY2xpZW50JztcblxuZnVuY3Rpb24gZ290byhocmVmLCBvcHRzID0geyByZXBsYWNlU3RhdGU6IGZhbHNlIH0pIHtcblx0Y29uc3QgdGFyZ2V0ID0gc2VsZWN0X3RhcmdldChuZXcgVVJMKGhyZWYsIGRvY3VtZW50LmJhc2VVUkkpKTtcblxuXHRpZiAodGFyZ2V0KSB7XG5cdFx0X2hpc3Rvcnlbb3B0cy5yZXBsYWNlU3RhdGUgPyAncmVwbGFjZVN0YXRlJyA6ICdwdXNoU3RhdGUnXSh7IGlkOiBjaWQgfSwgJycsIGhyZWYpO1xuXHRcdHJldHVybiBuYXZpZ2F0ZSh0YXJnZXQsIG51bGwpLnRoZW4oKCkgPT4ge30pO1xuXHR9XG5cblx0bG9jYXRpb24uaHJlZiA9IGhyZWY7XG5cdHJldHVybiBuZXcgUHJvbWlzZShmID0+IHt9KTsgLy8gbmV2ZXIgcmVzb2x2ZXNcbn1cblxuLyoqIENhbGxiYWNrIHRvIGluZm9ybSBvZiBhIHZhbHVlIHVwZGF0ZXMuICovXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cbmZ1bmN0aW9uIHBhZ2Vfc3RvcmUodmFsdWUpIHtcblx0Y29uc3Qgc3RvcmUgPSB3cml0YWJsZSh2YWx1ZSk7XG5cdGxldCByZWFkeSA9IHRydWU7XG5cblx0ZnVuY3Rpb24gbm90aWZ5KCkge1xuXHRcdHJlYWR5ID0gdHJ1ZTtcblx0XHRzdG9yZS51cGRhdGUodmFsID0+IHZhbCk7XG5cdH1cblxuXHRmdW5jdGlvbiBzZXQobmV3X3ZhbHVlKSB7XG5cdFx0cmVhZHkgPSBmYWxzZTtcblx0XHRzdG9yZS5zZXQobmV3X3ZhbHVlKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHN1YnNjcmliZShydW4pIHtcblx0XHRsZXQgb2xkX3ZhbHVlO1xuXHRcdHJldHVybiBzdG9yZS5zdWJzY3JpYmUoKHZhbHVlKSA9PiB7XG5cdFx0XHRpZiAob2xkX3ZhbHVlID09PSB1bmRlZmluZWQgfHwgKHJlYWR5ICYmIHZhbHVlICE9PSBvbGRfdmFsdWUpKSB7XG5cdFx0XHRcdHJ1bihvbGRfdmFsdWUgPSB2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRyZXR1cm4geyBub3RpZnksIHNldCwgc3Vic2NyaWJlIH07XG59XG5cbmNvbnN0IGluaXRpYWxfZGF0YSA9IHR5cGVvZiBfX1NBUFBFUl9fICE9PSAndW5kZWZpbmVkJyAmJiBfX1NBUFBFUl9fO1xuXG5sZXQgcmVhZHkgPSBmYWxzZTtcbmxldCByb290X2NvbXBvbmVudDtcbmxldCBjdXJyZW50X3Rva2VuO1xubGV0IHJvb3RfcHJlbG9hZGVkO1xubGV0IGN1cnJlbnRfYnJhbmNoID0gW107XG5sZXQgY3VycmVudF9xdWVyeSA9ICd7fSc7XG5cbmNvbnN0IHN0b3JlcyA9IHtcblx0cGFnZTogcGFnZV9zdG9yZSh7fSksXG5cdHByZWxvYWRpbmc6IHdyaXRhYmxlKG51bGwpLFxuXHRzZXNzaW9uOiB3cml0YWJsZShpbml0aWFsX2RhdGEgJiYgaW5pdGlhbF9kYXRhLnNlc3Npb24pXG59O1xuXG5sZXQgJHNlc3Npb247XG5sZXQgc2Vzc2lvbl9kaXJ0eTtcblxuc3RvcmVzLnNlc3Npb24uc3Vic2NyaWJlKGFzeW5jIHZhbHVlID0+IHtcblx0JHNlc3Npb24gPSB2YWx1ZTtcblxuXHRpZiAoIXJlYWR5KSByZXR1cm47XG5cdHNlc3Npb25fZGlydHkgPSB0cnVlO1xuXG5cdGNvbnN0IHRhcmdldCA9IHNlbGVjdF90YXJnZXQobmV3IFVSTChsb2NhdGlvbi5ocmVmKSk7XG5cblx0Y29uc3QgdG9rZW4gPSBjdXJyZW50X3Rva2VuID0ge307XG5cdGNvbnN0IHsgcmVkaXJlY3QsIHByb3BzLCBicmFuY2ggfSA9IGF3YWl0IGh5ZHJhdGVfdGFyZ2V0KHRhcmdldCk7XG5cdGlmICh0b2tlbiAhPT0gY3VycmVudF90b2tlbikgcmV0dXJuOyAvLyBhIHNlY29uZGFyeSBuYXZpZ2F0aW9uIGhhcHBlbmVkIHdoaWxlIHdlIHdlcmUgbG9hZGluZ1xuXG5cdGF3YWl0IHJlbmRlcihyZWRpcmVjdCwgYnJhbmNoLCBwcm9wcywgdGFyZ2V0LnBhZ2UpO1xufSk7XG5cbmxldCBwcmVmZXRjaGluZ1xuXG5cbiA9IG51bGw7XG5mdW5jdGlvbiBzZXRfcHJlZmV0Y2hpbmcoaHJlZiwgcHJvbWlzZSkge1xuXHRwcmVmZXRjaGluZyA9IHsgaHJlZiwgcHJvbWlzZSB9O1xufVxuXG5sZXQgdGFyZ2V0O1xuZnVuY3Rpb24gc2V0X3RhcmdldChlbGVtZW50KSB7XG5cdHRhcmdldCA9IGVsZW1lbnQ7XG59XG5cbmxldCB1aWQgPSAxO1xuZnVuY3Rpb24gc2V0X3VpZChuKSB7XG5cdHVpZCA9IG47XG59XG5cbmxldCBjaWQ7XG5mdW5jdGlvbiBzZXRfY2lkKG4pIHtcblx0Y2lkID0gbjtcbn1cblxuY29uc3QgX2hpc3RvcnkgPSB0eXBlb2YgaGlzdG9yeSAhPT0gJ3VuZGVmaW5lZCcgPyBoaXN0b3J5IDoge1xuXHRwdXNoU3RhdGU6IChzdGF0ZSwgdGl0bGUsIGhyZWYpID0+IHt9LFxuXHRyZXBsYWNlU3RhdGU6IChzdGF0ZSwgdGl0bGUsIGhyZWYpID0+IHt9LFxuXHRzY3JvbGxSZXN0b3JhdGlvbjogJydcbn07XG5cbmNvbnN0IHNjcm9sbF9oaXN0b3J5ID0ge307XG5cbmZ1bmN0aW9uIGV4dHJhY3RfcXVlcnkoc2VhcmNoKSB7XG5cdGNvbnN0IHF1ZXJ5ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblx0aWYgKHNlYXJjaC5sZW5ndGggPiAwKSB7XG5cdFx0c2VhcmNoLnNsaWNlKDEpLnNwbGl0KCcmJykuZm9yRWFjaChzZWFyY2hQYXJhbSA9PiB7XG5cdFx0XHRsZXQgWywga2V5LCB2YWx1ZSA9ICcnXSA9IC8oW149XSopKD86PSguKikpPy8uZXhlYyhkZWNvZGVVUklDb21wb25lbnQoc2VhcmNoUGFyYW0ucmVwbGFjZSgvXFwrL2csICcgJykpKTtcblx0XHRcdGlmICh0eXBlb2YgcXVlcnlba2V5XSA9PT0gJ3N0cmluZycpIHF1ZXJ5W2tleV0gPSBbcXVlcnlba2V5XV07XG5cdFx0XHRpZiAodHlwZW9mIHF1ZXJ5W2tleV0gPT09ICdvYmplY3QnKSAocXVlcnlba2V5XSApLnB1c2godmFsdWUpO1xuXHRcdFx0ZWxzZSBxdWVyeVtrZXldID0gdmFsdWU7XG5cdFx0fSk7XG5cdH1cblx0cmV0dXJuIHF1ZXJ5O1xufVxuXG5mdW5jdGlvbiBzZWxlY3RfdGFyZ2V0KHVybCkge1xuXHRpZiAodXJsLm9yaWdpbiAhPT0gbG9jYXRpb24ub3JpZ2luKSByZXR1cm4gbnVsbDtcblx0aWYgKCF1cmwucGF0aG5hbWUuc3RhcnRzV2l0aChpbml0aWFsX2RhdGEuYmFzZVVybCkpIHJldHVybiBudWxsO1xuXG5cdGxldCBwYXRoID0gdXJsLnBhdGhuYW1lLnNsaWNlKGluaXRpYWxfZGF0YS5iYXNlVXJsLmxlbmd0aCk7XG5cblx0aWYgKHBhdGggPT09ICcnKSB7XG5cdFx0cGF0aCA9ICcvJztcblx0fVxuXG5cdC8vIGF2b2lkIGFjY2lkZW50YWwgY2xhc2hlcyBiZXR3ZWVuIHNlcnZlciByb3V0ZXMgYW5kIHBhZ2Ugcm91dGVzXG5cdGlmIChpZ25vcmUuc29tZShwYXR0ZXJuID0+IHBhdHRlcm4udGVzdChwYXRoKSkpIHJldHVybjtcblxuXHRmb3IgKGxldCBpID0gMDsgaSA8IHJvdXRlcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdGNvbnN0IHJvdXRlID0gcm91dGVzW2ldO1xuXG5cdFx0Y29uc3QgbWF0Y2ggPSByb3V0ZS5wYXR0ZXJuLmV4ZWMocGF0aCk7XG5cblx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdGNvbnN0IHF1ZXJ5ID0gZXh0cmFjdF9xdWVyeSh1cmwuc2VhcmNoKTtcblx0XHRcdGNvbnN0IHBhcnQgPSByb3V0ZS5wYXJ0c1tyb3V0ZS5wYXJ0cy5sZW5ndGggLSAxXTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHBhcnQucGFyYW1zID8gcGFydC5wYXJhbXMobWF0Y2gpIDoge307XG5cblx0XHRcdGNvbnN0IHBhZ2UgPSB7IGhvc3Q6IGxvY2F0aW9uLmhvc3QsIHBhdGgsIHF1ZXJ5LCBwYXJhbXMgfTtcblxuXHRcdFx0cmV0dXJuIHsgaHJlZjogdXJsLmhyZWYsIHJvdXRlLCBtYXRjaCwgcGFnZSB9O1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBoYW5kbGVfZXJyb3IodXJsKSB7XG5cdGNvbnN0IHsgaG9zdCwgcGF0aG5hbWUsIHNlYXJjaCB9ID0gbG9jYXRpb247XG5cdGNvbnN0IHsgc2Vzc2lvbiwgcHJlbG9hZGVkLCBzdGF0dXMsIGVycm9yIH0gPSBpbml0aWFsX2RhdGE7XG5cblx0aWYgKCFyb290X3ByZWxvYWRlZCkge1xuXHRcdHJvb3RfcHJlbG9hZGVkID0gcHJlbG9hZGVkICYmIHByZWxvYWRlZFswXTtcblx0fVxuXG5cdGNvbnN0IHByb3BzID0ge1xuXHRcdGVycm9yLFxuXHRcdHN0YXR1cyxcblx0XHRzZXNzaW9uLFxuXHRcdGxldmVsMDoge1xuXHRcdFx0cHJvcHM6IHJvb3RfcHJlbG9hZGVkXG5cdFx0fSxcblx0XHRsZXZlbDE6IHtcblx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdHN0YXR1cyxcblx0XHRcdFx0ZXJyb3Jcblx0XHRcdH0sXG5cdFx0XHRjb21wb25lbnQ6IEVycm9yQ29tcG9uZW50XG5cdFx0fSxcblx0XHRzZWdtZW50czogcHJlbG9hZGVkXG5cblx0fTtcblx0Y29uc3QgcXVlcnkgPSBleHRyYWN0X3F1ZXJ5KHNlYXJjaCk7XG5cdHJlbmRlcihudWxsLCBbXSwgcHJvcHMsIHsgaG9zdCwgcGF0aDogcGF0aG5hbWUsIHF1ZXJ5LCBwYXJhbXM6IHt9IH0pO1xufVxuXG5mdW5jdGlvbiBzY3JvbGxfc3RhdGUoKSB7XG5cdHJldHVybiB7XG5cdFx0eDogcGFnZVhPZmZzZXQsXG5cdFx0eTogcGFnZVlPZmZzZXRcblx0fTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbmF2aWdhdGUodGFyZ2V0LCBpZCwgbm9zY3JvbGwsIGhhc2gpIHtcblx0aWYgKGlkKSB7XG5cdFx0Ly8gcG9wc3RhdGUgb3IgaW5pdGlhbCBuYXZpZ2F0aW9uXG5cdFx0Y2lkID0gaWQ7XG5cdH0gZWxzZSB7XG5cdFx0Y29uc3QgY3VycmVudF9zY3JvbGwgPSBzY3JvbGxfc3RhdGUoKTtcblxuXHRcdC8vIGNsaWNrZWQgb24gYSBsaW5rLiBwcmVzZXJ2ZSBzY3JvbGwgc3RhdGVcblx0XHRzY3JvbGxfaGlzdG9yeVtjaWRdID0gY3VycmVudF9zY3JvbGw7XG5cblx0XHRpZCA9IGNpZCA9ICsrdWlkO1xuXHRcdHNjcm9sbF9oaXN0b3J5W2NpZF0gPSBub3Njcm9sbCA/IGN1cnJlbnRfc2Nyb2xsIDogeyB4OiAwLCB5OiAwIH07XG5cdH1cblxuXHRjaWQgPSBpZDtcblxuXHRpZiAocm9vdF9jb21wb25lbnQpIHN0b3Jlcy5wcmVsb2FkaW5nLnNldCh0cnVlKTtcblxuXHRjb25zdCBsb2FkZWQgPSBwcmVmZXRjaGluZyAmJiBwcmVmZXRjaGluZy5ocmVmID09PSB0YXJnZXQuaHJlZiA/XG5cdFx0cHJlZmV0Y2hpbmcucHJvbWlzZSA6XG5cdFx0aHlkcmF0ZV90YXJnZXQodGFyZ2V0KTtcblxuXHRwcmVmZXRjaGluZyA9IG51bGw7XG5cblx0Y29uc3QgdG9rZW4gPSBjdXJyZW50X3Rva2VuID0ge307XG5cdGNvbnN0IHsgcmVkaXJlY3QsIHByb3BzLCBicmFuY2ggfSA9IGF3YWl0IGxvYWRlZDtcblx0aWYgKHRva2VuICE9PSBjdXJyZW50X3Rva2VuKSByZXR1cm47IC8vIGEgc2Vjb25kYXJ5IG5hdmlnYXRpb24gaGFwcGVuZWQgd2hpbGUgd2Ugd2VyZSBsb2FkaW5nXG5cblx0YXdhaXQgcmVuZGVyKHJlZGlyZWN0LCBicmFuY2gsIHByb3BzLCB0YXJnZXQucGFnZSk7XG5cdGlmIChkb2N1bWVudC5hY3RpdmVFbGVtZW50KSBkb2N1bWVudC5hY3RpdmVFbGVtZW50LmJsdXIoKTtcblxuXHRpZiAoIW5vc2Nyb2xsKSB7XG5cdFx0bGV0IHNjcm9sbCA9IHNjcm9sbF9oaXN0b3J5W2lkXTtcblxuXHRcdGlmIChoYXNoKSB7XG5cdFx0XHQvLyBzY3JvbGwgaXMgYW4gZWxlbWVudCBpZCAoZnJvbSBhIGhhc2gpLCB3ZSBuZWVkIHRvIGNvbXB1dGUgeS5cblx0XHRcdGNvbnN0IGRlZXBfbGlua2VkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaGFzaC5zbGljZSgxKSk7XG5cblx0XHRcdGlmIChkZWVwX2xpbmtlZCkge1xuXHRcdFx0XHRzY3JvbGwgPSB7XG5cdFx0XHRcdFx0eDogMCxcblx0XHRcdFx0XHR5OiBkZWVwX2xpbmtlZC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgKyBzY3JvbGxZXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0c2Nyb2xsX2hpc3RvcnlbY2lkXSA9IHNjcm9sbDtcblx0XHRpZiAoc2Nyb2xsKSBzY3JvbGxUbyhzY3JvbGwueCwgc2Nyb2xsLnkpO1xuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlbmRlcihyZWRpcmVjdCwgYnJhbmNoLCBwcm9wcywgcGFnZSkge1xuXHRpZiAocmVkaXJlY3QpIHJldHVybiBnb3RvKHJlZGlyZWN0LmxvY2F0aW9uLCB7IHJlcGxhY2VTdGF0ZTogdHJ1ZSB9KTtcblxuXHRzdG9yZXMucGFnZS5zZXQocGFnZSk7XG5cdHN0b3Jlcy5wcmVsb2FkaW5nLnNldChmYWxzZSk7XG5cblx0aWYgKHJvb3RfY29tcG9uZW50KSB7XG5cdFx0cm9vdF9jb21wb25lbnQuJHNldChwcm9wcyk7XG5cdH0gZWxzZSB7XG5cdFx0cHJvcHMuc3RvcmVzID0ge1xuXHRcdFx0cGFnZTogeyBzdWJzY3JpYmU6IHN0b3Jlcy5wYWdlLnN1YnNjcmliZSB9LFxuXHRcdFx0cHJlbG9hZGluZzogeyBzdWJzY3JpYmU6IHN0b3Jlcy5wcmVsb2FkaW5nLnN1YnNjcmliZSB9LFxuXHRcdFx0c2Vzc2lvbjogc3RvcmVzLnNlc3Npb25cblx0XHR9O1xuXHRcdHByb3BzLmxldmVsMCA9IHtcblx0XHRcdHByb3BzOiBhd2FpdCByb290X3ByZWxvYWRlZFxuXHRcdH07XG5cdFx0cHJvcHMubm90aWZ5ID0gc3RvcmVzLnBhZ2Uubm90aWZ5O1xuXG5cdFx0Ly8gZmlyc3QgbG9hZCDigJQgcmVtb3ZlIFNTUidkIDxoZWFkPiBjb250ZW50c1xuXHRcdGNvbnN0IHN0YXJ0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NhcHBlci1oZWFkLXN0YXJ0Jyk7XG5cdFx0Y29uc3QgZW5kID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NhcHBlci1oZWFkLWVuZCcpO1xuXG5cdFx0aWYgKHN0YXJ0ICYmIGVuZCkge1xuXHRcdFx0d2hpbGUgKHN0YXJ0Lm5leHRTaWJsaW5nICE9PSBlbmQpIGRldGFjaChzdGFydC5uZXh0U2libGluZyk7XG5cdFx0XHRkZXRhY2goc3RhcnQpO1xuXHRcdFx0ZGV0YWNoKGVuZCk7XG5cdFx0fVxuXG5cdFx0cm9vdF9jb21wb25lbnQgPSBuZXcgQXBwKHtcblx0XHRcdHRhcmdldCxcblx0XHRcdHByb3BzLFxuXHRcdFx0aHlkcmF0ZTogdHJ1ZVxuXHRcdH0pO1xuXHR9XG5cblx0Y3VycmVudF9icmFuY2ggPSBicmFuY2g7XG5cdGN1cnJlbnRfcXVlcnkgPSBKU09OLnN0cmluZ2lmeShwYWdlLnF1ZXJ5KTtcblx0cmVhZHkgPSB0cnVlO1xuXHRzZXNzaW9uX2RpcnR5ID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHBhcnRfY2hhbmdlZChpLCBzZWdtZW50LCBtYXRjaCwgc3RyaW5naWZpZWRfcXVlcnkpIHtcblx0Ly8gVE9ETyBvbmx5IGNoZWNrIHF1ZXJ5IHN0cmluZyBjaGFuZ2VzIGZvciBwcmVsb2FkIGZ1bmN0aW9uc1xuXHQvLyB0aGF0IGRvIGluIGZhY3QgZGVwZW5kIG9uIGl0ICh1c2luZyBzdGF0aWMgYW5hbHlzaXMgb3Jcblx0Ly8gcnVudGltZSBpbnN0cnVtZW50YXRpb24pXG5cdGlmIChzdHJpbmdpZmllZF9xdWVyeSAhPT0gY3VycmVudF9xdWVyeSkgcmV0dXJuIHRydWU7XG5cblx0Y29uc3QgcHJldmlvdXMgPSBjdXJyZW50X2JyYW5jaFtpXTtcblxuXHRpZiAoIXByZXZpb3VzKSByZXR1cm4gZmFsc2U7XG5cdGlmIChzZWdtZW50ICE9PSBwcmV2aW91cy5zZWdtZW50KSByZXR1cm4gdHJ1ZTtcblx0aWYgKHByZXZpb3VzLm1hdGNoKSB7XG5cdFx0aWYgKEpTT04uc3RyaW5naWZ5KHByZXZpb3VzLm1hdGNoLnNsaWNlKDEsIGkgKyAyKSkgIT09IEpTT04uc3RyaW5naWZ5KG1hdGNoLnNsaWNlKDEsIGkgKyAyKSkpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBoeWRyYXRlX3RhcmdldCh0YXJnZXQpXG5cblxuXG4ge1xuXHRjb25zdCB7IHJvdXRlLCBwYWdlIH0gPSB0YXJnZXQ7XG5cdGNvbnN0IHNlZ21lbnRzID0gcGFnZS5wYXRoLnNwbGl0KCcvJykuZmlsdGVyKEJvb2xlYW4pO1xuXG5cdGxldCByZWRpcmVjdCA9IG51bGw7XG5cblx0Y29uc3QgcHJvcHMgPSB7IGVycm9yOiBudWxsLCBzdGF0dXM6IDIwMCwgc2VnbWVudHM6IFtzZWdtZW50c1swXV0gfTtcblxuXHRjb25zdCBwcmVsb2FkX2NvbnRleHQgPSB7XG5cdFx0ZmV0Y2g6ICh1cmwsIG9wdHMpID0+IGZldGNoKHVybCwgb3B0cyksXG5cdFx0cmVkaXJlY3Q6IChzdGF0dXNDb2RlLCBsb2NhdGlvbikgPT4ge1xuXHRcdFx0aWYgKHJlZGlyZWN0ICYmIChyZWRpcmVjdC5zdGF0dXNDb2RlICE9PSBzdGF0dXNDb2RlIHx8IHJlZGlyZWN0LmxvY2F0aW9uICE9PSBsb2NhdGlvbikpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDb25mbGljdGluZyByZWRpcmVjdHNgKTtcblx0XHRcdH1cblx0XHRcdHJlZGlyZWN0ID0geyBzdGF0dXNDb2RlLCBsb2NhdGlvbiB9O1xuXHRcdH0sXG5cdFx0ZXJyb3I6IChzdGF0dXMsIGVycm9yKSA9PiB7XG5cdFx0XHRwcm9wcy5lcnJvciA9IHR5cGVvZiBlcnJvciA9PT0gJ3N0cmluZycgPyBuZXcgRXJyb3IoZXJyb3IpIDogZXJyb3I7XG5cdFx0XHRwcm9wcy5zdGF0dXMgPSBzdGF0dXM7XG5cdFx0fVxuXHR9O1xuXG5cdGlmICghcm9vdF9wcmVsb2FkZWQpIHtcblx0XHRyb290X3ByZWxvYWRlZCA9IGluaXRpYWxfZGF0YS5wcmVsb2FkZWRbMF0gfHwgcm9vdF9wcmVsb2FkLmNhbGwocHJlbG9hZF9jb250ZXh0LCB7XG5cdFx0XHRob3N0OiBwYWdlLmhvc3QsXG5cdFx0XHRwYXRoOiBwYWdlLnBhdGgsXG5cdFx0XHRxdWVyeTogcGFnZS5xdWVyeSxcblx0XHRcdHBhcmFtczoge31cblx0XHR9LCAkc2Vzc2lvbik7XG5cdH1cblxuXHRsZXQgYnJhbmNoO1xuXHRsZXQgbCA9IDE7XG5cblx0dHJ5IHtcblx0XHRjb25zdCBzdHJpbmdpZmllZF9xdWVyeSA9IEpTT04uc3RyaW5naWZ5KHBhZ2UucXVlcnkpO1xuXHRcdGNvbnN0IG1hdGNoID0gcm91dGUucGF0dGVybi5leGVjKHBhZ2UucGF0aCk7XG5cblx0XHRsZXQgc2VnbWVudF9kaXJ0eSA9IGZhbHNlO1xuXG5cdFx0YnJhbmNoID0gYXdhaXQgUHJvbWlzZS5hbGwocm91dGUucGFydHMubWFwKGFzeW5jIChwYXJ0LCBpKSA9PiB7XG5cdFx0XHRjb25zdCBzZWdtZW50ID0gc2VnbWVudHNbaV07XG5cblx0XHRcdGlmIChwYXJ0X2NoYW5nZWQoaSwgc2VnbWVudCwgbWF0Y2gsIHN0cmluZ2lmaWVkX3F1ZXJ5KSkgc2VnbWVudF9kaXJ0eSA9IHRydWU7XG5cblx0XHRcdHByb3BzLnNlZ21lbnRzW2xdID0gc2VnbWVudHNbaSArIDFdOyAvLyBUT0RPIG1ha2UgdGhpcyBsZXNzIGNvbmZ1c2luZ1xuXHRcdFx0aWYgKCFwYXJ0KSByZXR1cm4geyBzZWdtZW50IH07XG5cblx0XHRcdGNvbnN0IGogPSBsKys7XG5cblx0XHRcdGlmICghc2Vzc2lvbl9kaXJ0eSAmJiAhc2VnbWVudF9kaXJ0eSAmJiBjdXJyZW50X2JyYW5jaFtpXSAmJiBjdXJyZW50X2JyYW5jaFtpXS5wYXJ0ID09PSBwYXJ0LmkpIHtcblx0XHRcdFx0cmV0dXJuIGN1cnJlbnRfYnJhbmNoW2ldO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWdtZW50X2RpcnR5ID0gZmFsc2U7XG5cblx0XHRcdGNvbnN0IHsgZGVmYXVsdDogY29tcG9uZW50LCBwcmVsb2FkIH0gPSBhd2FpdCBsb2FkX2NvbXBvbmVudChjb21wb25lbnRzW3BhcnQuaV0pO1xuXG5cdFx0XHRsZXQgcHJlbG9hZGVkO1xuXHRcdFx0aWYgKHJlYWR5IHx8ICFpbml0aWFsX2RhdGEucHJlbG9hZGVkW2kgKyAxXSkge1xuXHRcdFx0XHRwcmVsb2FkZWQgPSBwcmVsb2FkXG5cdFx0XHRcdFx0PyBhd2FpdCBwcmVsb2FkLmNhbGwocHJlbG9hZF9jb250ZXh0LCB7XG5cdFx0XHRcdFx0XHRob3N0OiBwYWdlLmhvc3QsXG5cdFx0XHRcdFx0XHRwYXRoOiBwYWdlLnBhdGgsXG5cdFx0XHRcdFx0XHRxdWVyeTogcGFnZS5xdWVyeSxcblx0XHRcdFx0XHRcdHBhcmFtczogcGFydC5wYXJhbXMgPyBwYXJ0LnBhcmFtcyh0YXJnZXQubWF0Y2gpIDoge31cblx0XHRcdFx0XHR9LCAkc2Vzc2lvbilcblx0XHRcdFx0XHQ6IHt9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cHJlbG9hZGVkID0gaW5pdGlhbF9kYXRhLnByZWxvYWRlZFtpICsgMV07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAocHJvcHNbYGxldmVsJHtqfWBdID0geyBjb21wb25lbnQsIHByb3BzOiBwcmVsb2FkZWQsIHNlZ21lbnQsIG1hdGNoLCBwYXJ0OiBwYXJ0LmkgfSk7XG5cdFx0fSkpO1xuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHByb3BzLmVycm9yID0gZXJyb3I7XG5cdFx0cHJvcHMuc3RhdHVzID0gNTAwO1xuXHRcdGJyYW5jaCA9IFtdO1xuXHR9XG5cblx0cmV0dXJuIHsgcmVkaXJlY3QsIHByb3BzLCBicmFuY2ggfTtcbn1cblxuZnVuY3Rpb24gbG9hZF9jc3MoY2h1bmspIHtcblx0Y29uc3QgaHJlZiA9IGBjbGllbnQvJHtjaHVua31gO1xuXHRpZiAoZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgbGlua1tocmVmPVwiJHtocmVmfVwiXWApKSByZXR1cm47XG5cblx0cmV0dXJuIG5ldyBQcm9taXNlKChmdWxmaWwsIHJlamVjdCkgPT4ge1xuXHRcdGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG5cdFx0bGluay5yZWwgPSAnc3R5bGVzaGVldCc7XG5cdFx0bGluay5ocmVmID0gaHJlZjtcblxuXHRcdGxpbmsub25sb2FkID0gKCkgPT4gZnVsZmlsKCk7XG5cdFx0bGluay5vbmVycm9yID0gcmVqZWN0O1xuXG5cdFx0ZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChsaW5rKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGxvYWRfY29tcG9uZW50KGNvbXBvbmVudClcblxuXG4ge1xuXHQvLyBUT0RPIHRoaXMgaXMgdGVtcG9yYXJ5IOKAlCBvbmNlIHBsYWNlaG9sZGVycyBhcmVcblx0Ly8gYWx3YXlzIHJld3JpdHRlbiwgc2NyYXRjaCB0aGUgdGVybmFyeVxuXHRjb25zdCBwcm9taXNlcyA9ICh0eXBlb2YgY29tcG9uZW50LmNzcyA9PT0gJ3N0cmluZycgPyBbXSA6IGNvbXBvbmVudC5jc3MubWFwKGxvYWRfY3NzKSk7XG5cdHByb21pc2VzLnVuc2hpZnQoY29tcG9uZW50LmpzKCkpO1xuXHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4odmFsdWVzID0+IHZhbHVlc1swXSk7XG59XG5cbmZ1bmN0aW9uIGRldGFjaChub2RlKSB7XG5cdG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbn1cblxuZnVuY3Rpb24gcHJlZmV0Y2goaHJlZikge1xuXHRjb25zdCB0YXJnZXQgPSBzZWxlY3RfdGFyZ2V0KG5ldyBVUkwoaHJlZiwgZG9jdW1lbnQuYmFzZVVSSSkpO1xuXG5cdGlmICh0YXJnZXQpIHtcblx0XHRpZiAoIXByZWZldGNoaW5nIHx8IGhyZWYgIT09IHByZWZldGNoaW5nLmhyZWYpIHtcblx0XHRcdHNldF9wcmVmZXRjaGluZyhocmVmLCBoeWRyYXRlX3RhcmdldCh0YXJnZXQpKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcHJlZmV0Y2hpbmcucHJvbWlzZTtcblx0fVxufVxuXG5mdW5jdGlvbiBzdGFydChvcHRzXG5cbikge1xuXHRpZiAoJ3Njcm9sbFJlc3RvcmF0aW9uJyBpbiBfaGlzdG9yeSkge1xuXHRcdF9oaXN0b3J5LnNjcm9sbFJlc3RvcmF0aW9uID0gJ21hbnVhbCc7XG5cdH1cblx0XG5cdC8vIEFkb3B0ZWQgZnJvbSBOdXh0LmpzXG5cdC8vIFJlc2V0IHNjcm9sbFJlc3RvcmF0aW9uIHRvIGF1dG8gd2hlbiBsZWF2aW5nIHBhZ2UsIGFsbG93aW5nIHBhZ2UgcmVsb2FkXG5cdC8vIGFuZCBiYWNrLW5hdmlnYXRpb24gZnJvbSBvdGhlciBwYWdlcyB0byB1c2UgdGhlIGJyb3dzZXIgdG8gcmVzdG9yZSB0aGVcblx0Ly8gc2Nyb2xsaW5nIHBvc2l0aW9uLlxuXHRhZGRFdmVudExpc3RlbmVyKCdiZWZvcmV1bmxvYWQnLCAoKSA9PiB7XG5cdFx0X2hpc3Rvcnkuc2Nyb2xsUmVzdG9yYXRpb24gPSAnYXV0byc7XG5cdH0pO1xuXG5cdC8vIFNldHRpbmcgc2Nyb2xsUmVzdG9yYXRpb24gdG8gbWFudWFsIGFnYWluIHdoZW4gcmV0dXJuaW5nIHRvIHRoaXMgcGFnZS5cblx0YWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHtcblx0XHRfaGlzdG9yeS5zY3JvbGxSZXN0b3JhdGlvbiA9ICdtYW51YWwnO1xuXHR9KTtcblxuXHRzZXRfdGFyZ2V0KG9wdHMudGFyZ2V0KTtcblxuXHRhZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGhhbmRsZV9jbGljayk7XG5cdGFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgaGFuZGxlX3BvcHN0YXRlKTtcblxuXHQvLyBwcmVmZXRjaFxuXHRhZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdHJpZ2dlcl9wcmVmZXRjaCk7XG5cdGFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGhhbmRsZV9tb3VzZW1vdmUpO1xuXG5cdHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHtcblx0XHRjb25zdCB7IGhhc2gsIGhyZWYgfSA9IGxvY2F0aW9uO1xuXG5cdFx0X2hpc3RvcnkucmVwbGFjZVN0YXRlKHsgaWQ6IHVpZCB9LCAnJywgaHJlZik7XG5cblx0XHRjb25zdCB1cmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuXG5cdFx0aWYgKGluaXRpYWxfZGF0YS5lcnJvcikgcmV0dXJuIGhhbmRsZV9lcnJvcigpO1xuXG5cdFx0Y29uc3QgdGFyZ2V0ID0gc2VsZWN0X3RhcmdldCh1cmwpO1xuXHRcdGlmICh0YXJnZXQpIHJldHVybiBuYXZpZ2F0ZSh0YXJnZXQsIHVpZCwgdHJ1ZSwgaGFzaCk7XG5cdH0pO1xufVxuXG5sZXQgbW91c2Vtb3ZlX3RpbWVvdXQ7XG5cbmZ1bmN0aW9uIGhhbmRsZV9tb3VzZW1vdmUoZXZlbnQpIHtcblx0Y2xlYXJUaW1lb3V0KG1vdXNlbW92ZV90aW1lb3V0KTtcblx0bW91c2Vtb3ZlX3RpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHR0cmlnZ2VyX3ByZWZldGNoKGV2ZW50KTtcblx0fSwgMjApO1xufVxuXG5mdW5jdGlvbiB0cmlnZ2VyX3ByZWZldGNoKGV2ZW50KSB7XG5cdGNvbnN0IGEgPSBmaW5kX2FuY2hvcihldmVudC50YXJnZXQpO1xuXHRpZiAoIWEgfHwgYS5yZWwgIT09ICdwcmVmZXRjaCcpIHJldHVybjtcblxuXHRwcmVmZXRjaChhLmhyZWYpO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVfY2xpY2soZXZlbnQpIHtcblx0Ly8gQWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS92aXNpb25tZWRpYS9wYWdlLmpzXG5cdC8vIE1JVCBsaWNlbnNlIGh0dHBzOi8vZ2l0aHViLmNvbS92aXNpb25tZWRpYS9wYWdlLmpzI2xpY2Vuc2Vcblx0aWYgKHdoaWNoKGV2ZW50KSAhPT0gMSkgcmV0dXJuO1xuXHRpZiAoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5IHx8IGV2ZW50LnNoaWZ0S2V5KSByZXR1cm47XG5cdGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKSByZXR1cm47XG5cblx0Y29uc3QgYSA9IGZpbmRfYW5jaG9yKGV2ZW50LnRhcmdldCk7XG5cdGlmICghYSkgcmV0dXJuO1xuXG5cdGlmICghYS5ocmVmKSByZXR1cm47XG5cblx0Ly8gY2hlY2sgaWYgbGluayBpcyBpbnNpZGUgYW4gc3ZnXG5cdC8vIGluIHRoaXMgY2FzZSwgYm90aCBocmVmIGFuZCB0YXJnZXQgYXJlIGFsd2F5cyBpbnNpZGUgYW4gb2JqZWN0XG5cdGNvbnN0IHN2ZyA9IHR5cGVvZiBhLmhyZWYgPT09ICdvYmplY3QnICYmIGEuaHJlZi5jb25zdHJ1Y3Rvci5uYW1lID09PSAnU1ZHQW5pbWF0ZWRTdHJpbmcnO1xuXHRjb25zdCBocmVmID0gU3RyaW5nKHN2ZyA/IChhKS5ocmVmLmJhc2VWYWwgOiBhLmhyZWYpO1xuXG5cdGlmIChocmVmID09PSBsb2NhdGlvbi5ocmVmKSB7XG5cdFx0aWYgKCFsb2NhdGlvbi5oYXNoKSBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdC8vIElnbm9yZSBpZiB0YWcgaGFzXG5cdC8vIDEuICdkb3dubG9hZCcgYXR0cmlidXRlXG5cdC8vIDIuIHJlbD0nZXh0ZXJuYWwnIGF0dHJpYnV0ZVxuXHRpZiAoYS5oYXNBdHRyaWJ1dGUoJ2Rvd25sb2FkJykgfHwgYS5nZXRBdHRyaWJ1dGUoJ3JlbCcpID09PSAnZXh0ZXJuYWwnKSByZXR1cm47XG5cblx0Ly8gSWdub3JlIGlmIDxhPiBoYXMgYSB0YXJnZXRcblx0aWYgKHN2ZyA/IChhKS50YXJnZXQuYmFzZVZhbCA6IGEudGFyZ2V0KSByZXR1cm47XG5cblx0Y29uc3QgdXJsID0gbmV3IFVSTChocmVmKTtcblxuXHQvLyBEb24ndCBoYW5kbGUgaGFzaCBjaGFuZ2VzXG5cdGlmICh1cmwucGF0aG5hbWUgPT09IGxvY2F0aW9uLnBhdGhuYW1lICYmIHVybC5zZWFyY2ggPT09IGxvY2F0aW9uLnNlYXJjaCkgcmV0dXJuO1xuXG5cdGNvbnN0IHRhcmdldCA9IHNlbGVjdF90YXJnZXQodXJsKTtcblx0aWYgKHRhcmdldCkge1xuXHRcdGNvbnN0IG5vc2Nyb2xsID0gYS5oYXNBdHRyaWJ1dGUoJ3NhcHBlci1ub3Njcm9sbCcpO1xuXHRcdG5hdmlnYXRlKHRhcmdldCwgbnVsbCwgbm9zY3JvbGwsIHVybC5oYXNoKTtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdF9oaXN0b3J5LnB1c2hTdGF0ZSh7IGlkOiBjaWQgfSwgJycsIHVybC5ocmVmKTtcblx0fVxufVxuXG5mdW5jdGlvbiB3aGljaChldmVudCkge1xuXHRyZXR1cm4gZXZlbnQud2hpY2ggPT09IG51bGwgPyBldmVudC5idXR0b24gOiBldmVudC53aGljaDtcbn1cblxuZnVuY3Rpb24gZmluZF9hbmNob3Iobm9kZSkge1xuXHR3aGlsZSAobm9kZSAmJiBub2RlLm5vZGVOYW1lLnRvVXBwZXJDYXNlKCkgIT09ICdBJykgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTsgLy8gU1ZHIDxhPiBlbGVtZW50cyBoYXZlIGEgbG93ZXJjYXNlIG5hbWVcblx0cmV0dXJuIG5vZGU7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZV9wb3BzdGF0ZShldmVudCkge1xuXHRzY3JvbGxfaGlzdG9yeVtjaWRdID0gc2Nyb2xsX3N0YXRlKCk7XG5cblx0aWYgKGV2ZW50LnN0YXRlKSB7XG5cdFx0Y29uc3QgdXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcblx0XHRjb25zdCB0YXJnZXQgPSBzZWxlY3RfdGFyZ2V0KHVybCk7XG5cdFx0aWYgKHRhcmdldCkge1xuXHRcdFx0bmF2aWdhdGUodGFyZ2V0LCBldmVudC5zdGF0ZS5pZCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvY2F0aW9uLmhyZWYgPSBsb2NhdGlvbi5ocmVmO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHQvLyBoYXNoY2hhbmdlXG5cdFx0c2V0X3VpZCh1aWQgKyAxKTtcblx0XHRzZXRfY2lkKHVpZCk7XG5cdFx0X2hpc3RvcnkucmVwbGFjZVN0YXRlKHsgaWQ6IGNpZCB9LCAnJywgbG9jYXRpb24uaHJlZik7XG5cdH1cbn1cblxuZnVuY3Rpb24gcHJlZmV0Y2hSb3V0ZXMocGF0aG5hbWVzKSB7XG5cdHJldHVybiByb3V0ZXNcblx0XHQuZmlsdGVyKHBhdGhuYW1lc1xuXHRcdFx0PyByb3V0ZSA9PiBwYXRobmFtZXMuc29tZShwYXRobmFtZSA9PiByb3V0ZS5wYXR0ZXJuLnRlc3QocGF0aG5hbWUpKVxuXHRcdFx0OiAoKSA9PiB0cnVlXG5cdFx0KVxuXHRcdC5yZWR1Y2UoKHByb21pc2UsIHJvdXRlKSA9PiBwcm9taXNlLnRoZW4oKCkgPT4ge1xuXHRcdFx0cmV0dXJuIFByb21pc2UuYWxsKHJvdXRlLnBhcnRzLm1hcChwYXJ0ID0+IHBhcnQgJiYgbG9hZF9jb21wb25lbnQoY29tcG9uZW50c1twYXJ0LmldKSkpO1xuXHRcdH0pLCBQcm9taXNlLnJlc29sdmUoKSk7XG59XG5cbmNvbnN0IHN0b3JlcyQxID0gKCkgPT4gZ2V0Q29udGV4dChDT05URVhUX0tFWSk7XG5cbmV4cG9ydCB7IGdvdG8sIHByZWZldGNoLCBwcmVmZXRjaFJvdXRlcywgc3RhcnQsIHN0b3JlcyQxIGFzIHN0b3JlcyB9O1xuIiwiZXhwb3J0IHZhciBUWVBFO1xuKGZ1bmN0aW9uIChUWVBFKSB7XG4gICAgLyoqXG4gICAgICogUmF3IHRleHRcbiAgICAgKi9cbiAgICBUWVBFW1RZUEVbXCJsaXRlcmFsXCJdID0gMF0gPSBcImxpdGVyYWxcIjtcbiAgICAvKipcbiAgICAgKiBWYXJpYWJsZSB3L28gYW55IGZvcm1hdCwgZS5nIGB2YXJgIGluIGB0aGlzIGlzIGEge3Zhcn1gXG4gICAgICovXG4gICAgVFlQRVtUWVBFW1wiYXJndW1lbnRcIl0gPSAxXSA9IFwiYXJndW1lbnRcIjtcbiAgICAvKipcbiAgICAgKiBWYXJpYWJsZSB3LyBudW1iZXIgZm9ybWF0XG4gICAgICovXG4gICAgVFlQRVtUWVBFW1wibnVtYmVyXCJdID0gMl0gPSBcIm51bWJlclwiO1xuICAgIC8qKlxuICAgICAqIFZhcmlhYmxlIHcvIGRhdGUgZm9ybWF0XG4gICAgICovXG4gICAgVFlQRVtUWVBFW1wiZGF0ZVwiXSA9IDNdID0gXCJkYXRlXCI7XG4gICAgLyoqXG4gICAgICogVmFyaWFibGUgdy8gdGltZSBmb3JtYXRcbiAgICAgKi9cbiAgICBUWVBFW1RZUEVbXCJ0aW1lXCJdID0gNF0gPSBcInRpbWVcIjtcbiAgICAvKipcbiAgICAgKiBWYXJpYWJsZSB3LyBzZWxlY3QgZm9ybWF0XG4gICAgICovXG4gICAgVFlQRVtUWVBFW1wic2VsZWN0XCJdID0gNV0gPSBcInNlbGVjdFwiO1xuICAgIC8qKlxuICAgICAqIFZhcmlhYmxlIHcvIHBsdXJhbCBmb3JtYXRcbiAgICAgKi9cbiAgICBUWVBFW1RZUEVbXCJwbHVyYWxcIl0gPSA2XSA9IFwicGx1cmFsXCI7XG4gICAgLyoqXG4gICAgICogT25seSBwb3NzaWJsZSB3aXRoaW4gcGx1cmFsIGFyZ3VtZW50LlxuICAgICAqIFRoaXMgaXMgdGhlIGAjYCBzeW1ib2wgdGhhdCB3aWxsIGJlIHN1YnN0aXR1dGVkIHdpdGggdGhlIGNvdW50LlxuICAgICAqL1xuICAgIFRZUEVbVFlQRVtcInBvdW5kXCJdID0gN10gPSBcInBvdW5kXCI7XG59KShUWVBFIHx8IChUWVBFID0ge30pKTtcbi8qKlxuICogVHlwZSBHdWFyZHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTGl0ZXJhbEVsZW1lbnQoZWwpIHtcbiAgICByZXR1cm4gZWwudHlwZSA9PT0gVFlQRS5saXRlcmFsO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzQXJndW1lbnRFbGVtZW50KGVsKSB7XG4gICAgcmV0dXJuIGVsLnR5cGUgPT09IFRZUEUuYXJndW1lbnQ7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXJFbGVtZW50KGVsKSB7XG4gICAgcmV0dXJuIGVsLnR5cGUgPT09IFRZUEUubnVtYmVyO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzRGF0ZUVsZW1lbnQoZWwpIHtcbiAgICByZXR1cm4gZWwudHlwZSA9PT0gVFlQRS5kYXRlO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzVGltZUVsZW1lbnQoZWwpIHtcbiAgICByZXR1cm4gZWwudHlwZSA9PT0gVFlQRS50aW1lO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzU2VsZWN0RWxlbWVudChlbCkge1xuICAgIHJldHVybiBlbC50eXBlID09PSBUWVBFLnNlbGVjdDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc1BsdXJhbEVsZW1lbnQoZWwpIHtcbiAgICByZXR1cm4gZWwudHlwZSA9PT0gVFlQRS5wbHVyYWw7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNQb3VuZEVsZW1lbnQoZWwpIHtcbiAgICByZXR1cm4gZWwudHlwZSA9PT0gVFlQRS5wb3VuZDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlclNrZWxldG9uKGVsKSB7XG4gICAgcmV0dXJuICEhKGVsICYmIHR5cGVvZiBlbCA9PT0gJ29iamVjdCcgJiYgZWwudHlwZSA9PT0gMCAvKiBudW1iZXIgKi8pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzRGF0ZVRpbWVTa2VsZXRvbihlbCkge1xuICAgIHJldHVybiAhIShlbCAmJiB0eXBlb2YgZWwgPT09ICdvYmplY3QnICYmIGVsLnR5cGUgPT09IDEgLyogZGF0ZVRpbWUgKi8pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxpdGVyYWxFbGVtZW50KHZhbHVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogVFlQRS5saXRlcmFsLFxuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgfTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVOdW1iZXJFbGVtZW50KHZhbHVlLCBzdHlsZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFRZUEUubnVtYmVyLFxuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgIHN0eWxlOiBzdHlsZSxcbiAgICB9O1xufVxuIiwiLy8gdHNsaW50OmRpc2FibGU6b25seS1hcnJvdy1mdW5jdGlvbnNcbi8vIHRzbGludDpkaXNhYmxlOm9iamVjdC1saXRlcmFsLXNob3J0aGFuZFxuLy8gdHNsaW50OmRpc2FibGU6dHJhaWxpbmctY29tbWFcbi8vIHRzbGludDpkaXNhYmxlOm9iamVjdC1saXRlcmFsLXNvcnQta2V5c1xuLy8gdHNsaW50OmRpc2FibGU6b25lLXZhcmlhYmxlLXBlci1kZWNsYXJhdGlvblxuLy8gdHNsaW50OmRpc2FibGU6bWF4LWxpbmUtbGVuZ3RoXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zZWN1dGl2ZS1ibGFuay1saW5lc1xuLy8gdHNsaW50OmRpc2FibGU6YWxpZ25cbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZXh0ZW5kU3RhdGljcyA9IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgICAgIGV4dGVuZFN0YXRpY3MgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHxcbiAgICAgICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdOyB9O1xuICAgICAgICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcbiAgICB9O1xuICAgIHJldHVybiBmdW5jdGlvbiAoZCwgYikge1xuICAgICAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xuICAgICAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICAgICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xuICAgIH07XG59KSgpO1xudmFyIF9fYXNzaWduID0gKHRoaXMgJiYgdGhpcy5fX2Fzc2lnbikgfHwgZnVuY3Rpb24gKCkge1xuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbih0KSB7XG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSlcbiAgICAgICAgICAgICAgICB0W3BdID0gc1twXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdDtcbiAgICB9O1xuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcbi8vIEdlbmVyYXRlZCBieSBQRUcuanMgdi4gMC4xMC4wICh0cy1wZWdqcyBwbHVnaW4gdi4gMC4yLjYgKVxuLy9cbi8vIGh0dHBzOi8vcGVnanMub3JnLyAgIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRhZGV2cHJvL3RzLXBlZ2pzXG5pbXBvcnQgeyBUWVBFLCB9IGZyb20gJy4vdHlwZXMnO1xudmFyIFN5bnRheEVycm9yID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTeW50YXhFcnJvciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBTeW50YXhFcnJvcihtZXNzYWdlLCBleHBlY3RlZCwgZm91bmQsIGxvY2F0aW9uKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IF9zdXBlci5jYWxsKHRoaXMpIHx8IHRoaXM7XG4gICAgICAgIF90aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICBfdGhpcy5leHBlY3RlZCA9IGV4cGVjdGVkO1xuICAgICAgICBfdGhpcy5mb3VuZCA9IGZvdW5kO1xuICAgICAgICBfdGhpcy5sb2NhdGlvbiA9IGxvY2F0aW9uO1xuICAgICAgICBfdGhpcy5uYW1lID0gXCJTeW50YXhFcnJvclwiO1xuICAgICAgICBpZiAodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKF90aGlzLCBTeW50YXhFcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF90aGlzO1xuICAgIH1cbiAgICBTeW50YXhFcnJvci5idWlsZE1lc3NhZ2UgPSBmdW5jdGlvbiAoZXhwZWN0ZWQsIGZvdW5kKSB7XG4gICAgICAgIGZ1bmN0aW9uIGhleChjaCkge1xuICAgICAgICAgICAgcmV0dXJuIGNoLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gbGl0ZXJhbEVzY2FwZShzKSB7XG4gICAgICAgICAgICByZXR1cm4gc1xuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcL2csIFwiXFxcXFxcXFxcIilcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgXCJcXFxcXFxcIlwiKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXDAvZywgXCJcXFxcMFwiKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXHQvZywgXCJcXFxcdFwiKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXG4vZywgXCJcXFxcblwiKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXHIvZywgXCJcXFxcclwiKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9bXFx4MDAtXFx4MEZdL2csIGZ1bmN0aW9uIChjaCkgeyByZXR1cm4gXCJcXFxceDBcIiArIGhleChjaCk7IH0pXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoL1tcXHgxMC1cXHgxRlxceDdGLVxceDlGXS9nLCBmdW5jdGlvbiAoY2gpIHsgcmV0dXJuIFwiXFxcXHhcIiArIGhleChjaCk7IH0pO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIGNsYXNzRXNjYXBlKHMpIHtcbiAgICAgICAgICAgIHJldHVybiBzXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgXCJcXFxcXFxcXFwiKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXF0vZywgXCJcXFxcXVwiKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXF4vZywgXCJcXFxcXlwiKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8tL2csIFwiXFxcXC1cIilcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFwwL2csIFwiXFxcXDBcIilcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFx0L2csIFwiXFxcXHRcIilcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxuL2csIFwiXFxcXG5cIilcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxyL2csIFwiXFxcXHJcIilcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvW1xceDAwLVxceDBGXS9nLCBmdW5jdGlvbiAoY2gpIHsgcmV0dXJuIFwiXFxcXHgwXCIgKyBoZXgoY2gpOyB9KVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9bXFx4MTAtXFx4MUZcXHg3Ri1cXHg5Rl0vZywgZnVuY3Rpb24gKGNoKSB7IHJldHVybiBcIlxcXFx4XCIgKyBoZXgoY2gpOyB9KTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBkZXNjcmliZUV4cGVjdGF0aW9uKGV4cGVjdGF0aW9uKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGV4cGVjdGF0aW9uLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwibGl0ZXJhbFwiOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJcXFwiXCIgKyBsaXRlcmFsRXNjYXBlKGV4cGVjdGF0aW9uLnRleHQpICsgXCJcXFwiXCI7XG4gICAgICAgICAgICAgICAgY2FzZSBcImNsYXNzXCI6XG4gICAgICAgICAgICAgICAgICAgIHZhciBlc2NhcGVkUGFydHMgPSBleHBlY3RhdGlvbi5wYXJ0cy5tYXAoZnVuY3Rpb24gKHBhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHBhcnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBjbGFzc0VzY2FwZShwYXJ0WzBdKSArIFwiLVwiICsgY2xhc3NFc2NhcGUocGFydFsxXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGNsYXNzRXNjYXBlKHBhcnQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiW1wiICsgKGV4cGVjdGF0aW9uLmludmVydGVkID8gXCJeXCIgOiBcIlwiKSArIGVzY2FwZWRQYXJ0cyArIFwiXVwiO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJhbnlcIjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiYW55IGNoYXJhY3RlclwiO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJlbmRcIjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiZW5kIG9mIGlucHV0XCI7XG4gICAgICAgICAgICAgICAgY2FzZSBcIm90aGVyXCI6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBleHBlY3RhdGlvbi5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBkZXNjcmliZUV4cGVjdGVkKGV4cGVjdGVkMSkge1xuICAgICAgICAgICAgdmFyIGRlc2NyaXB0aW9ucyA9IGV4cGVjdGVkMS5tYXAoZGVzY3JpYmVFeHBlY3RhdGlvbik7XG4gICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgIHZhciBqO1xuICAgICAgICAgICAgZGVzY3JpcHRpb25zLnNvcnQoKTtcbiAgICAgICAgICAgIGlmIChkZXNjcmlwdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDEsIGogPSAxOyBpIDwgZGVzY3JpcHRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXNjcmlwdGlvbnNbaSAtIDFdICE9PSBkZXNjcmlwdGlvbnNbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uc1tqXSA9IGRlc2NyaXB0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGorKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbnMubGVuZ3RoID0gajtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3aXRjaCAoZGVzY3JpcHRpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlc2NyaXB0aW9uc1swXTtcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkZXNjcmlwdGlvbnNbMF0gKyBcIiBvciBcIiArIGRlc2NyaXB0aW9uc1sxXTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVzY3JpcHRpb25zLnNsaWNlKDAsIC0xKS5qb2luKFwiLCBcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICsgXCIsIG9yIFwiXG4gICAgICAgICAgICAgICAgICAgICAgICArIGRlc2NyaXB0aW9uc1tkZXNjcmlwdGlvbnMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gZGVzY3JpYmVGb3VuZChmb3VuZDEpIHtcbiAgICAgICAgICAgIHJldHVybiBmb3VuZDEgPyBcIlxcXCJcIiArIGxpdGVyYWxFc2NhcGUoZm91bmQxKSArIFwiXFxcIlwiIDogXCJlbmQgb2YgaW5wdXRcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gXCJFeHBlY3RlZCBcIiArIGRlc2NyaWJlRXhwZWN0ZWQoZXhwZWN0ZWQpICsgXCIgYnV0IFwiICsgZGVzY3JpYmVGb3VuZChmb3VuZCkgKyBcIiBmb3VuZC5cIjtcbiAgICB9O1xuICAgIHJldHVybiBTeW50YXhFcnJvcjtcbn0oRXJyb3IpKTtcbmV4cG9ydCB7IFN5bnRheEVycm9yIH07XG5mdW5jdGlvbiBwZWckcGFyc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucyA6IHt9O1xuICAgIHZhciBwZWckRkFJTEVEID0ge307XG4gICAgdmFyIHBlZyRzdGFydFJ1bGVGdW5jdGlvbnMgPSB7IHN0YXJ0OiBwZWckcGFyc2VzdGFydCB9O1xuICAgIHZhciBwZWckc3RhcnRSdWxlRnVuY3Rpb24gPSBwZWckcGFyc2VzdGFydDtcbiAgICB2YXIgcGVnJGMwID0gZnVuY3Rpb24gKHBhcnRzKSB7XG4gICAgICAgIHJldHVybiBwYXJ0cy5qb2luKCcnKTtcbiAgICB9O1xuICAgIHZhciBwZWckYzEgPSBmdW5jdGlvbiAobWVzc2FnZVRleHQpIHtcbiAgICAgICAgcmV0dXJuIF9fYXNzaWduKHsgdHlwZTogVFlQRS5saXRlcmFsLCB2YWx1ZTogbWVzc2FnZVRleHQgfSwgaW5zZXJ0TG9jYXRpb24oKSk7XG4gICAgfTtcbiAgICB2YXIgcGVnJGMyID0gXCIjXCI7XG4gICAgdmFyIHBlZyRjMyA9IHBlZyRsaXRlcmFsRXhwZWN0YXRpb24oXCIjXCIsIGZhbHNlKTtcbiAgICB2YXIgcGVnJGM0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gX19hc3NpZ24oeyB0eXBlOiBUWVBFLnBvdW5kIH0sIGluc2VydExvY2F0aW9uKCkpO1xuICAgIH07XG4gICAgdmFyIHBlZyRjNSA9IHBlZyRvdGhlckV4cGVjdGF0aW9uKFwiYXJndW1lbnRFbGVtZW50XCIpO1xuICAgIHZhciBwZWckYzYgPSBcIntcIjtcbiAgICB2YXIgcGVnJGM3ID0gcGVnJGxpdGVyYWxFeHBlY3RhdGlvbihcIntcIiwgZmFsc2UpO1xuICAgIHZhciBwZWckYzggPSBcIn1cIjtcbiAgICB2YXIgcGVnJGM5ID0gcGVnJGxpdGVyYWxFeHBlY3RhdGlvbihcIn1cIiwgZmFsc2UpO1xuICAgIHZhciBwZWckYzEwID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBfX2Fzc2lnbih7IHR5cGU6IFRZUEUuYXJndW1lbnQsIHZhbHVlOiB2YWx1ZSB9LCBpbnNlcnRMb2NhdGlvbigpKTtcbiAgICB9O1xuICAgIHZhciBwZWckYzExID0gcGVnJG90aGVyRXhwZWN0YXRpb24oXCJudW1iZXJTa2VsZXRvbklkXCIpO1xuICAgIHZhciBwZWckYzEyID0gL15bJ1xcL3t9XS87XG4gICAgdmFyIHBlZyRjMTMgPSBwZWckY2xhc3NFeHBlY3RhdGlvbihbXCInXCIsIFwiL1wiLCBcIntcIiwgXCJ9XCJdLCBmYWxzZSwgZmFsc2UpO1xuICAgIHZhciBwZWckYzE0ID0gcGVnJGFueUV4cGVjdGF0aW9uKCk7XG4gICAgdmFyIHBlZyRjMTUgPSBwZWckb3RoZXJFeHBlY3RhdGlvbihcIm51bWJlclNrZWxldG9uVG9rZW5PcHRpb25cIik7XG4gICAgdmFyIHBlZyRjMTYgPSBcIi9cIjtcbiAgICB2YXIgcGVnJGMxNyA9IHBlZyRsaXRlcmFsRXhwZWN0YXRpb24oXCIvXCIsIGZhbHNlKTtcbiAgICB2YXIgcGVnJGMxOCA9IGZ1bmN0aW9uIChvcHRpb24pIHsgcmV0dXJuIG9wdGlvbjsgfTtcbiAgICB2YXIgcGVnJGMxOSA9IHBlZyRvdGhlckV4cGVjdGF0aW9uKFwibnVtYmVyU2tlbGV0b25Ub2tlblwiKTtcbiAgICB2YXIgcGVnJGMyMCA9IGZ1bmN0aW9uIChzdGVtLCBvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiB7IHN0ZW06IHN0ZW0sIG9wdGlvbnM6IG9wdGlvbnMgfTtcbiAgICB9O1xuICAgIHZhciBwZWckYzIxID0gZnVuY3Rpb24gKHRva2Vucykge1xuICAgICAgICByZXR1cm4gX19hc3NpZ24oeyB0eXBlOiAwIC8qIG51bWJlciAqLywgdG9rZW5zOiB0b2tlbnMgfSwgaW5zZXJ0TG9jYXRpb24oKSk7XG4gICAgfTtcbiAgICB2YXIgcGVnJGMyMiA9IFwiOjpcIjtcbiAgICB2YXIgcGVnJGMyMyA9IHBlZyRsaXRlcmFsRXhwZWN0YXRpb24oXCI6OlwiLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjMjQgPSBmdW5jdGlvbiAoc2tlbGV0b24pIHsgcmV0dXJuIHNrZWxldG9uOyB9O1xuICAgIHZhciBwZWckYzI1ID0gZnVuY3Rpb24gKCkgeyBtZXNzYWdlQ3R4LnB1c2goJ251bWJlckFyZ1N0eWxlJyk7IHJldHVybiB0cnVlOyB9O1xuICAgIHZhciBwZWckYzI2ID0gZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgICAgIG1lc3NhZ2VDdHgucG9wKCk7XG4gICAgICAgIHJldHVybiBzdHlsZS5yZXBsYWNlKC9cXHMqJC8sICcnKTtcbiAgICB9O1xuICAgIHZhciBwZWckYzI3ID0gXCIsXCI7XG4gICAgdmFyIHBlZyRjMjggPSBwZWckbGl0ZXJhbEV4cGVjdGF0aW9uKFwiLFwiLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjMjkgPSBcIm51bWJlclwiO1xuICAgIHZhciBwZWckYzMwID0gcGVnJGxpdGVyYWxFeHBlY3RhdGlvbihcIm51bWJlclwiLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjMzEgPSBmdW5jdGlvbiAodmFsdWUsIHR5cGUsIHN0eWxlKSB7XG4gICAgICAgIHJldHVybiBfX2Fzc2lnbih7IHR5cGU6IHR5cGUgPT09ICdudW1iZXInID8gVFlQRS5udW1iZXIgOiB0eXBlID09PSAnZGF0ZScgPyBUWVBFLmRhdGUgOiBUWVBFLnRpbWUsIHN0eWxlOiBzdHlsZSAmJiBzdHlsZVsyXSwgdmFsdWU6IHZhbHVlIH0sIGluc2VydExvY2F0aW9uKCkpO1xuICAgIH07XG4gICAgdmFyIHBlZyRjMzIgPSBcIidcIjtcbiAgICB2YXIgcGVnJGMzMyA9IHBlZyRsaXRlcmFsRXhwZWN0YXRpb24oXCInXCIsIGZhbHNlKTtcbiAgICB2YXIgcGVnJGMzNCA9IC9eW14nXS87XG4gICAgdmFyIHBlZyRjMzUgPSBwZWckY2xhc3NFeHBlY3RhdGlvbihbXCInXCJdLCB0cnVlLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjMzYgPSAvXlteYS16QS1aJ3t9XS87XG4gICAgdmFyIHBlZyRjMzcgPSBwZWckY2xhc3NFeHBlY3RhdGlvbihbW1wiYVwiLCBcInpcIl0sIFtcIkFcIiwgXCJaXCJdLCBcIidcIiwgXCJ7XCIsIFwifVwiXSwgdHJ1ZSwgZmFsc2UpO1xuICAgIHZhciBwZWckYzM4ID0gL15bYS16QS1aXS87XG4gICAgdmFyIHBlZyRjMzkgPSBwZWckY2xhc3NFeHBlY3RhdGlvbihbW1wiYVwiLCBcInpcIl0sIFtcIkFcIiwgXCJaXCJdXSwgZmFsc2UsIGZhbHNlKTtcbiAgICB2YXIgcGVnJGM0MCA9IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gICAgICAgIHJldHVybiBfX2Fzc2lnbih7IHR5cGU6IDEgLyogZGF0ZVRpbWUgKi8sIHBhdHRlcm46IHBhdHRlcm4gfSwgaW5zZXJ0TG9jYXRpb24oKSk7XG4gICAgfTtcbiAgICB2YXIgcGVnJGM0MSA9IGZ1bmN0aW9uICgpIHsgbWVzc2FnZUN0eC5wdXNoKCdkYXRlT3JUaW1lQXJnU3R5bGUnKTsgcmV0dXJuIHRydWU7IH07XG4gICAgdmFyIHBlZyRjNDIgPSBcImRhdGVcIjtcbiAgICB2YXIgcGVnJGM0MyA9IHBlZyRsaXRlcmFsRXhwZWN0YXRpb24oXCJkYXRlXCIsIGZhbHNlKTtcbiAgICB2YXIgcGVnJGM0NCA9IFwidGltZVwiO1xuICAgIHZhciBwZWckYzQ1ID0gcGVnJGxpdGVyYWxFeHBlY3RhdGlvbihcInRpbWVcIiwgZmFsc2UpO1xuICAgIHZhciBwZWckYzQ2ID0gXCJwbHVyYWxcIjtcbiAgICB2YXIgcGVnJGM0NyA9IHBlZyRsaXRlcmFsRXhwZWN0YXRpb24oXCJwbHVyYWxcIiwgZmFsc2UpO1xuICAgIHZhciBwZWckYzQ4ID0gXCJzZWxlY3RvcmRpbmFsXCI7XG4gICAgdmFyIHBlZyRjNDkgPSBwZWckbGl0ZXJhbEV4cGVjdGF0aW9uKFwic2VsZWN0b3JkaW5hbFwiLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjNTAgPSBcIm9mZnNldDpcIjtcbiAgICB2YXIgcGVnJGM1MSA9IHBlZyRsaXRlcmFsRXhwZWN0YXRpb24oXCJvZmZzZXQ6XCIsIGZhbHNlKTtcbiAgICB2YXIgcGVnJGM1MiA9IGZ1bmN0aW9uICh2YWx1ZSwgcGx1cmFsVHlwZSwgb2Zmc2V0LCBvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBfX2Fzc2lnbih7IHR5cGU6IFRZUEUucGx1cmFsLCBwbHVyYWxUeXBlOiBwbHVyYWxUeXBlID09PSAncGx1cmFsJyA/ICdjYXJkaW5hbCcgOiAnb3JkaW5hbCcsIHZhbHVlOiB2YWx1ZSwgb2Zmc2V0OiBvZmZzZXQgPyBvZmZzZXRbMl0gOiAwLCBvcHRpb25zOiBvcHRpb25zLnJlZHVjZShmdW5jdGlvbiAoYWxsLCBfYSkge1xuICAgICAgICAgICAgICAgIHZhciBpZCA9IF9hLmlkLCB2YWx1ZSA9IF9hLnZhbHVlLCBvcHRpb25Mb2NhdGlvbiA9IF9hLmxvY2F0aW9uO1xuICAgICAgICAgICAgICAgIGlmIChpZCBpbiBhbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3IoXCJEdXBsaWNhdGUgb3B0aW9uIFxcXCJcIiArIGlkICsgXCJcXFwiIGluIHBsdXJhbCBlbGVtZW50OiBcXFwiXCIgKyB0ZXh0KCkgKyBcIlxcXCJcIiwgbG9jYXRpb24oKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFsbFtpZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb246IG9wdGlvbkxvY2F0aW9uXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYWxsO1xuICAgICAgICAgICAgfSwge30pIH0sIGluc2VydExvY2F0aW9uKCkpO1xuICAgIH07XG4gICAgdmFyIHBlZyRjNTMgPSBcInNlbGVjdFwiO1xuICAgIHZhciBwZWckYzU0ID0gcGVnJGxpdGVyYWxFeHBlY3RhdGlvbihcInNlbGVjdFwiLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjNTUgPSBmdW5jdGlvbiAodmFsdWUsIG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIF9fYXNzaWduKHsgdHlwZTogVFlQRS5zZWxlY3QsIHZhbHVlOiB2YWx1ZSwgb3B0aW9uczogb3B0aW9ucy5yZWR1Y2UoZnVuY3Rpb24gKGFsbCwgX2EpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWQgPSBfYS5pZCwgdmFsdWUgPSBfYS52YWx1ZSwgb3B0aW9uTG9jYXRpb24gPSBfYS5sb2NhdGlvbjtcbiAgICAgICAgICAgICAgICBpZiAoaWQgaW4gYWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yKFwiRHVwbGljYXRlIG9wdGlvbiBcXFwiXCIgKyBpZCArIFwiXFxcIiBpbiBzZWxlY3QgZWxlbWVudDogXFxcIlwiICsgdGV4dCgpICsgXCJcXFwiXCIsIGxvY2F0aW9uKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhbGxbaWRdID0ge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBvcHRpb25Mb2NhdGlvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFsbDtcbiAgICAgICAgICAgIH0sIHt9KSB9LCBpbnNlcnRMb2NhdGlvbigpKTtcbiAgICB9O1xuICAgIHZhciBwZWckYzU2ID0gXCI9XCI7XG4gICAgdmFyIHBlZyRjNTcgPSBwZWckbGl0ZXJhbEV4cGVjdGF0aW9uKFwiPVwiLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjNTggPSBmdW5jdGlvbiAoaWQpIHsgbWVzc2FnZUN0eC5wdXNoKCdzZWxlY3QnKTsgcmV0dXJuIHRydWU7IH07XG4gICAgdmFyIHBlZyRjNTkgPSBmdW5jdGlvbiAoaWQsIHZhbHVlKSB7XG4gICAgICAgIG1lc3NhZ2VDdHgucG9wKCk7XG4gICAgICAgIHJldHVybiBfX2Fzc2lnbih7IGlkOiBpZCxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSB9LCBpbnNlcnRMb2NhdGlvbigpKTtcbiAgICB9O1xuICAgIHZhciBwZWckYzYwID0gZnVuY3Rpb24gKGlkKSB7IG1lc3NhZ2VDdHgucHVzaCgncGx1cmFsJyk7IHJldHVybiB0cnVlOyB9O1xuICAgIHZhciBwZWckYzYxID0gZnVuY3Rpb24gKGlkLCB2YWx1ZSkge1xuICAgICAgICBtZXNzYWdlQ3R4LnBvcCgpO1xuICAgICAgICByZXR1cm4gX19hc3NpZ24oeyBpZDogaWQsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUgfSwgaW5zZXJ0TG9jYXRpb24oKSk7XG4gICAgfTtcbiAgICB2YXIgcGVnJGM2MiA9IHBlZyRvdGhlckV4cGVjdGF0aW9uKFwid2hpdGVzcGFjZVwiKTtcbiAgICB2YXIgcGVnJGM2MyA9IC9eW1xcdC1cXHIgXFx4ODVcXHhBMFxcdTE2ODBcXHUyMDAwLVxcdTIwMEFcXHUyMDI4XFx1MjAyOVxcdTIwMkZcXHUyMDVGXFx1MzAwMF0vO1xuICAgIHZhciBwZWckYzY0ID0gcGVnJGNsYXNzRXhwZWN0YXRpb24oW1tcIlxcdFwiLCBcIlxcclwiXSwgXCIgXCIsIFwiXFx4ODVcIiwgXCJcXHhBMFwiLCBcIlxcdTE2ODBcIiwgW1wiXFx1MjAwMFwiLCBcIlxcdTIwMEFcIl0sIFwiXFx1MjAyOFwiLCBcIlxcdTIwMjlcIiwgXCJcXHUyMDJGXCIsIFwiXFx1MjA1RlwiLCBcIlxcdTMwMDBcIl0sIGZhbHNlLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjNjUgPSBwZWckb3RoZXJFeHBlY3RhdGlvbihcInN5bnRheCBwYXR0ZXJuXCIpO1xuICAgIHZhciBwZWckYzY2ID0gL15bIS1cXC86LUBbLVxcXmB7LX5cXHhBMS1cXHhBN1xceEE5XFx4QUJcXHhBQ1xceEFFXFx4QjBcXHhCMVxceEI2XFx4QkJcXHhCRlxceEQ3XFx4RjdcXHUyMDEwLVxcdTIwMjdcXHUyMDMwLVxcdTIwM0VcXHUyMDQxLVxcdTIwNTNcXHUyMDU1LVxcdTIwNUVcXHUyMTkwLVxcdTI0NUZcXHUyNTAwLVxcdTI3NzVcXHUyNzk0LVxcdTJCRkZcXHUyRTAwLVxcdTJFN0ZcXHUzMDAxLVxcdTMwMDNcXHUzMDA4LVxcdTMwMjBcXHUzMDMwXFx1RkQzRVxcdUZEM0ZcXHVGRTQ1XFx1RkU0Nl0vO1xuICAgIHZhciBwZWckYzY3ID0gcGVnJGNsYXNzRXhwZWN0YXRpb24oW1tcIiFcIiwgXCIvXCJdLCBbXCI6XCIsIFwiQFwiXSwgW1wiW1wiLCBcIl5cIl0sIFwiYFwiLCBbXCJ7XCIsIFwiflwiXSwgW1wiXFx4QTFcIiwgXCJcXHhBN1wiXSwgXCJcXHhBOVwiLCBcIlxceEFCXCIsIFwiXFx4QUNcIiwgXCJcXHhBRVwiLCBcIlxceEIwXCIsIFwiXFx4QjFcIiwgXCJcXHhCNlwiLCBcIlxceEJCXCIsIFwiXFx4QkZcIiwgXCJcXHhEN1wiLCBcIlxceEY3XCIsIFtcIlxcdTIwMTBcIiwgXCJcXHUyMDI3XCJdLCBbXCJcXHUyMDMwXCIsIFwiXFx1MjAzRVwiXSwgW1wiXFx1MjA0MVwiLCBcIlxcdTIwNTNcIl0sIFtcIlxcdTIwNTVcIiwgXCJcXHUyMDVFXCJdLCBbXCJcXHUyMTkwXCIsIFwiXFx1MjQ1RlwiXSwgW1wiXFx1MjUwMFwiLCBcIlxcdTI3NzVcIl0sIFtcIlxcdTI3OTRcIiwgXCJcXHUyQkZGXCJdLCBbXCJcXHUyRTAwXCIsIFwiXFx1MkU3RlwiXSwgW1wiXFx1MzAwMVwiLCBcIlxcdTMwMDNcIl0sIFtcIlxcdTMwMDhcIiwgXCJcXHUzMDIwXCJdLCBcIlxcdTMwMzBcIiwgXCJcXHVGRDNFXCIsIFwiXFx1RkQzRlwiLCBcIlxcdUZFNDVcIiwgXCJcXHVGRTQ2XCJdLCBmYWxzZSwgZmFsc2UpO1xuICAgIHZhciBwZWckYzY4ID0gcGVnJG90aGVyRXhwZWN0YXRpb24oXCJvcHRpb25hbCB3aGl0ZXNwYWNlXCIpO1xuICAgIHZhciBwZWckYzY5ID0gcGVnJG90aGVyRXhwZWN0YXRpb24oXCJudW1iZXJcIik7XG4gICAgdmFyIHBlZyRjNzAgPSBcIi1cIjtcbiAgICB2YXIgcGVnJGM3MSA9IHBlZyRsaXRlcmFsRXhwZWN0YXRpb24oXCItXCIsIGZhbHNlKTtcbiAgICB2YXIgcGVnJGM3MiA9IGZ1bmN0aW9uIChuZWdhdGl2ZSwgbnVtKSB7XG4gICAgICAgIHJldHVybiBudW1cbiAgICAgICAgICAgID8gbmVnYXRpdmVcbiAgICAgICAgICAgICAgICA/IC1udW1cbiAgICAgICAgICAgICAgICA6IG51bVxuICAgICAgICAgICAgOiAwO1xuICAgIH07XG4gICAgdmFyIHBlZyRjNzMgPSBwZWckb3RoZXJFeHBlY3RhdGlvbihcImFwb3N0cm9waGVcIik7XG4gICAgdmFyIHBlZyRjNzQgPSBwZWckb3RoZXJFeHBlY3RhdGlvbihcImRvdWJsZSBhcG9zdHJvcGhlc1wiKTtcbiAgICB2YXIgcGVnJGM3NSA9IFwiJydcIjtcbiAgICB2YXIgcGVnJGM3NiA9IHBlZyRsaXRlcmFsRXhwZWN0YXRpb24oXCInJ1wiLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjNzcgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBcIidcIjsgfTtcbiAgICB2YXIgcGVnJGM3OCA9IGZ1bmN0aW9uIChlc2NhcGVkQ2hhciwgcXVvdGVkQ2hhcnMpIHtcbiAgICAgICAgcmV0dXJuIGVzY2FwZWRDaGFyICsgcXVvdGVkQ2hhcnMucmVwbGFjZShcIicnXCIsIFwiJ1wiKTtcbiAgICB9O1xuICAgIHZhciBwZWckYzc5ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuICh4ICE9PSAneycgJiZcbiAgICAgICAgICAgICEoaXNJblBsdXJhbE9wdGlvbigpICYmIHggPT09ICcjJykgJiZcbiAgICAgICAgICAgICEoaXNOZXN0ZWRNZXNzYWdlVGV4dCgpICYmIHggPT09ICd9JykpO1xuICAgIH07XG4gICAgdmFyIHBlZyRjODAgPSBcIlxcblwiO1xuICAgIHZhciBwZWckYzgxID0gcGVnJGxpdGVyYWxFeHBlY3RhdGlvbihcIlxcblwiLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjODIgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICByZXR1cm4geCA9PT0gJ3snIHx8IHggPT09ICd9JyB8fCAoaXNJblBsdXJhbE9wdGlvbigpICYmIHggPT09ICcjJyk7XG4gICAgfTtcbiAgICB2YXIgcGVnJGM4MyA9IHBlZyRvdGhlckV4cGVjdGF0aW9uKFwiYXJnTmFtZU9yTnVtYmVyXCIpO1xuICAgIHZhciBwZWckYzg0ID0gcGVnJG90aGVyRXhwZWN0YXRpb24oXCJhcmdOdW1iZXJcIik7XG4gICAgdmFyIHBlZyRjODUgPSBcIjBcIjtcbiAgICB2YXIgcGVnJGM4NiA9IHBlZyRsaXRlcmFsRXhwZWN0YXRpb24oXCIwXCIsIGZhbHNlKTtcbiAgICB2YXIgcGVnJGM4NyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDA7IH07XG4gICAgdmFyIHBlZyRjODggPSAvXlsxLTldLztcbiAgICB2YXIgcGVnJGM4OSA9IHBlZyRjbGFzc0V4cGVjdGF0aW9uKFtbXCIxXCIsIFwiOVwiXV0sIGZhbHNlLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjOTAgPSAvXlswLTldLztcbiAgICB2YXIgcGVnJGM5MSA9IHBlZyRjbGFzc0V4cGVjdGF0aW9uKFtbXCIwXCIsIFwiOVwiXV0sIGZhbHNlLCBmYWxzZSk7XG4gICAgdmFyIHBlZyRjOTIgPSBmdW5jdGlvbiAoZGlnaXRzKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUludChkaWdpdHMuam9pbignJyksIDEwKTtcbiAgICB9O1xuICAgIHZhciBwZWckYzkzID0gcGVnJG90aGVyRXhwZWN0YXRpb24oXCJhcmdOYW1lXCIpO1xuICAgIHZhciBwZWckY3VyclBvcyA9IDA7XG4gICAgdmFyIHBlZyRzYXZlZFBvcyA9IDA7XG4gICAgdmFyIHBlZyRwb3NEZXRhaWxzQ2FjaGUgPSBbeyBsaW5lOiAxLCBjb2x1bW46IDEgfV07XG4gICAgdmFyIHBlZyRtYXhGYWlsUG9zID0gMDtcbiAgICB2YXIgcGVnJG1heEZhaWxFeHBlY3RlZCA9IFtdO1xuICAgIHZhciBwZWckc2lsZW50RmFpbHMgPSAwO1xuICAgIHZhciBwZWckcmVzdWx0O1xuICAgIGlmIChvcHRpb25zLnN0YXJ0UnVsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICghKG9wdGlvbnMuc3RhcnRSdWxlIGluIHBlZyRzdGFydFJ1bGVGdW5jdGlvbnMpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBzdGFydCBwYXJzaW5nIGZyb20gcnVsZSBcXFwiXCIgKyBvcHRpb25zLnN0YXJ0UnVsZSArIFwiXFxcIi5cIik7XG4gICAgICAgIH1cbiAgICAgICAgcGVnJHN0YXJ0UnVsZUZ1bmN0aW9uID0gcGVnJHN0YXJ0UnVsZUZ1bmN0aW9uc1tvcHRpb25zLnN0YXJ0UnVsZV07XG4gICAgfVxuICAgIGZ1bmN0aW9uIHRleHQoKSB7XG4gICAgICAgIHJldHVybiBpbnB1dC5zdWJzdHJpbmcocGVnJHNhdmVkUG9zLCBwZWckY3VyclBvcyk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGxvY2F0aW9uKCkge1xuICAgICAgICByZXR1cm4gcGVnJGNvbXB1dGVMb2NhdGlvbihwZWckc2F2ZWRQb3MsIHBlZyRjdXJyUG9zKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZXhwZWN0ZWQoZGVzY3JpcHRpb24sIGxvY2F0aW9uMSkge1xuICAgICAgICBsb2NhdGlvbjEgPSBsb2NhdGlvbjEgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBsb2NhdGlvbjFcbiAgICAgICAgICAgIDogcGVnJGNvbXB1dGVMb2NhdGlvbihwZWckc2F2ZWRQb3MsIHBlZyRjdXJyUG9zKTtcbiAgICAgICAgdGhyb3cgcGVnJGJ1aWxkU3RydWN0dXJlZEVycm9yKFtwZWckb3RoZXJFeHBlY3RhdGlvbihkZXNjcmlwdGlvbildLCBpbnB1dC5zdWJzdHJpbmcocGVnJHNhdmVkUG9zLCBwZWckY3VyclBvcyksIGxvY2F0aW9uMSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGVycm9yKG1lc3NhZ2UsIGxvY2F0aW9uMSkge1xuICAgICAgICBsb2NhdGlvbjEgPSBsb2NhdGlvbjEgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBsb2NhdGlvbjFcbiAgICAgICAgICAgIDogcGVnJGNvbXB1dGVMb2NhdGlvbihwZWckc2F2ZWRQb3MsIHBlZyRjdXJyUG9zKTtcbiAgICAgICAgdGhyb3cgcGVnJGJ1aWxkU2ltcGxlRXJyb3IobWVzc2FnZSwgbG9jYXRpb24xKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJGxpdGVyYWxFeHBlY3RhdGlvbih0ZXh0MSwgaWdub3JlQ2FzZSkge1xuICAgICAgICByZXR1cm4geyB0eXBlOiBcImxpdGVyYWxcIiwgdGV4dDogdGV4dDEsIGlnbm9yZUNhc2U6IGlnbm9yZUNhc2UgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJGNsYXNzRXhwZWN0YXRpb24ocGFydHMsIGludmVydGVkLCBpZ25vcmVDYXNlKSB7XG4gICAgICAgIHJldHVybiB7IHR5cGU6IFwiY2xhc3NcIiwgcGFydHM6IHBhcnRzLCBpbnZlcnRlZDogaW52ZXJ0ZWQsIGlnbm9yZUNhc2U6IGlnbm9yZUNhc2UgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJGFueUV4cGVjdGF0aW9uKCkge1xuICAgICAgICByZXR1cm4geyB0eXBlOiBcImFueVwiIH07XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRlbmRFeHBlY3RhdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogXCJlbmRcIiB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckb3RoZXJFeHBlY3RhdGlvbihkZXNjcmlwdGlvbikge1xuICAgICAgICByZXR1cm4geyB0eXBlOiBcIm90aGVyXCIsIGRlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbiB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckY29tcHV0ZVBvc0RldGFpbHMocG9zKSB7XG4gICAgICAgIHZhciBkZXRhaWxzID0gcGVnJHBvc0RldGFpbHNDYWNoZVtwb3NdO1xuICAgICAgICB2YXIgcDtcbiAgICAgICAgaWYgKGRldGFpbHMpIHtcbiAgICAgICAgICAgIHJldHVybiBkZXRhaWxzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcCA9IHBvcyAtIDE7XG4gICAgICAgICAgICB3aGlsZSAoIXBlZyRwb3NEZXRhaWxzQ2FjaGVbcF0pIHtcbiAgICAgICAgICAgICAgICBwLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZXRhaWxzID0gcGVnJHBvc0RldGFpbHNDYWNoZVtwXTtcbiAgICAgICAgICAgIGRldGFpbHMgPSB7XG4gICAgICAgICAgICAgICAgbGluZTogZGV0YWlscy5saW5lLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogZGV0YWlscy5jb2x1bW5cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB3aGlsZSAocCA8IHBvcykge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHApID09PSAxMCkge1xuICAgICAgICAgICAgICAgICAgICBkZXRhaWxzLmxpbmUrKztcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscy5jb2x1bW4gPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscy5jb2x1bW4rKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGVnJHBvc0RldGFpbHNDYWNoZVtwb3NdID0gZGV0YWlscztcbiAgICAgICAgICAgIHJldHVybiBkZXRhaWxzO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRjb21wdXRlTG9jYXRpb24oc3RhcnRQb3MsIGVuZFBvcykge1xuICAgICAgICB2YXIgc3RhcnRQb3NEZXRhaWxzID0gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHN0YXJ0UG9zKTtcbiAgICAgICAgdmFyIGVuZFBvc0RldGFpbHMgPSBwZWckY29tcHV0ZVBvc0RldGFpbHMoZW5kUG9zKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0OiBzdGFydFBvcyxcbiAgICAgICAgICAgICAgICBsaW5lOiBzdGFydFBvc0RldGFpbHMubGluZSxcbiAgICAgICAgICAgICAgICBjb2x1bW46IHN0YXJ0UG9zRGV0YWlscy5jb2x1bW5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbmQ6IHtcbiAgICAgICAgICAgICAgICBvZmZzZXQ6IGVuZFBvcyxcbiAgICAgICAgICAgICAgICBsaW5lOiBlbmRQb3NEZXRhaWxzLmxpbmUsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBlbmRQb3NEZXRhaWxzLmNvbHVtblxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckZmFpbChleHBlY3RlZDEpIHtcbiAgICAgICAgaWYgKHBlZyRjdXJyUG9zIDwgcGVnJG1heEZhaWxQb3MpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGVnJGN1cnJQb3MgPiBwZWckbWF4RmFpbFBvcykge1xuICAgICAgICAgICAgcGVnJG1heEZhaWxQb3MgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgIHBlZyRtYXhGYWlsRXhwZWN0ZWQgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBwZWckbWF4RmFpbEV4cGVjdGVkLnB1c2goZXhwZWN0ZWQxKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJGJ1aWxkU2ltcGxlRXJyb3IobWVzc2FnZSwgbG9jYXRpb24xKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3ludGF4RXJyb3IobWVzc2FnZSwgW10sIFwiXCIsIGxvY2F0aW9uMSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRidWlsZFN0cnVjdHVyZWRFcnJvcihleHBlY3RlZDEsIGZvdW5kLCBsb2NhdGlvbjEpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTeW50YXhFcnJvcihTeW50YXhFcnJvci5idWlsZE1lc3NhZ2UoZXhwZWN0ZWQxLCBmb3VuZCksIGV4cGVjdGVkMSwgZm91bmQsIGxvY2F0aW9uMSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXN0YXJ0KCkge1xuICAgICAgICB2YXIgczA7XG4gICAgICAgIHMwID0gcGVnJHBhcnNlbWVzc2FnZSgpO1xuICAgICAgICByZXR1cm4gczA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZW1lc3NhZ2UoKSB7XG4gICAgICAgIHZhciBzMCwgczE7XG4gICAgICAgIHMwID0gW107XG4gICAgICAgIHMxID0gcGVnJHBhcnNlbWVzc2FnZUVsZW1lbnQoKTtcbiAgICAgICAgd2hpbGUgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMC5wdXNoKHMxKTtcbiAgICAgICAgICAgIHMxID0gcGVnJHBhcnNlbWVzc2FnZUVsZW1lbnQoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gczA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZW1lc3NhZ2VFbGVtZW50KCkge1xuICAgICAgICB2YXIgczA7XG4gICAgICAgIHMwID0gcGVnJHBhcnNlbGl0ZXJhbEVsZW1lbnQoKTtcbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMCA9IHBlZyRwYXJzZWFyZ3VtZW50RWxlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckcGFyc2VzaW1wbGVGb3JtYXRFbGVtZW50KCk7XG4gICAgICAgICAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJHBhcnNlcGx1cmFsRWxlbWVudCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJHBhcnNlc2VsZWN0RWxlbWVudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckcGFyc2Vwb3VuZEVsZW1lbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gczA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZW1lc3NhZ2VUZXh0KCkge1xuICAgICAgICB2YXIgczAsIHMxLCBzMjtcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgczEgPSBbXTtcbiAgICAgICAgczIgPSBwZWckcGFyc2Vkb3VibGVBcG9zdHJvcGhlcygpO1xuICAgICAgICBpZiAoczIgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMyID0gcGVnJHBhcnNlcXVvdGVkU3RyaW5nKCk7XG4gICAgICAgICAgICBpZiAoczIgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMiA9IHBlZyRwYXJzZXVucXVvdGVkU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgICAgICAgICBzMiA9IHBlZyRwYXJzZWRvdWJsZUFwb3N0cm9waGVzKCk7XG4gICAgICAgICAgICAgICAgaWYgKHMyID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHMyID0gcGVnJHBhcnNlcXVvdGVkU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzMiA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgczIgPSBwZWckcGFyc2V1bnF1b3RlZFN0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMChzMSk7XG4gICAgICAgIH1cbiAgICAgICAgczAgPSBzMTtcbiAgICAgICAgcmV0dXJuIHMwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VsaXRlcmFsRWxlbWVudCgpIHtcbiAgICAgICAgdmFyIHMwLCBzMTtcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgczEgPSBwZWckcGFyc2VtZXNzYWdlVGV4dCgpO1xuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRzYXZlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzEoczEpO1xuICAgICAgICB9XG4gICAgICAgIHMwID0gczE7XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlcG91bmRFbGVtZW50KCkge1xuICAgICAgICB2YXIgczAsIHMxO1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDM1KSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMjtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGMzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRzYXZlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzQoKTtcbiAgICAgICAgfVxuICAgICAgICBzMCA9IHMxO1xuICAgICAgICByZXR1cm4gczA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWFyZ3VtZW50RWxlbWVudCgpIHtcbiAgICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczU7XG4gICAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDEyMykge1xuICAgICAgICAgICAgczEgPSBwZWckYzY7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjNyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlYXJnTmFtZU9yTnVtYmVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gMTI1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczUgPSBwZWckYzg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjOSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczEgPSBwZWckYzEwKHMzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICB9XG4gICAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlbnVtYmVyU2tlbGV0b25JZCgpIHtcbiAgICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcbiAgICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gW107XG4gICAgICAgIHMyID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMzID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgICBzNCA9IHBlZyRwYXJzZXdoaXRlU3BhY2UoKTtcbiAgICAgICAgaWYgKHM0ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBpZiAocGVnJGMxMi50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzEzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICAgIGlmIChzNCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgaWYgKGlucHV0Lmxlbmd0aCA+IHBlZyRjdXJyUG9zKSB7XG4gICAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzE0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMyA9IFtzMywgczRdO1xuICAgICAgICAgICAgICAgIHMyID0gczM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgICAgICAgICBzMiA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgICAgIHMzID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICAgICAgICAgICAgczQgPSBwZWckcGFyc2V3aGl0ZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgaWYgKHM0ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWckYzEyLnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGMxMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICAgICAgICAgICAgaWYgKHM0ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMztcbiAgICAgICAgICAgICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0Lmxlbmd0aCA+IHBlZyRjdXJyUG9zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMTQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgczMgPSBbczMsIHM0XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMyID0gczM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgICAgICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczAgPSBpbnB1dC5zdWJzdHJpbmcoczAsIHBlZyRjdXJyUG9zKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgIH1cbiAgICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMTEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlbnVtYmVyU2tlbGV0b25Ub2tlbk9wdGlvbigpIHtcbiAgICAgICAgdmFyIHMwLCBzMSwgczI7XG4gICAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ3KSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMTY7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMTcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczIgPSBwZWckcGFyc2VudW1iZXJTa2VsZXRvbklkKCk7XG4gICAgICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBwZWckc2F2ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMTgoczIpO1xuICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMTUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlbnVtYmVyU2tlbGV0b25Ub2tlbigpIHtcbiAgICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNDtcbiAgICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gcGVnJHBhcnNlXygpO1xuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMyID0gcGVnJHBhcnNlbnVtYmVyU2tlbGV0b25JZCgpO1xuICAgICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczMgPSBbXTtcbiAgICAgICAgICAgICAgICBzNCA9IHBlZyRwYXJzZW51bWJlclNrZWxldG9uVG9rZW5PcHRpb24oKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgczMucHVzaChzNCk7XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlbnVtYmVyU2tlbGV0b25Ub2tlbk9wdGlvbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMxID0gcGVnJGMyMChzMiwgczMpO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgfVxuICAgICAgICBwZWckc2lsZW50RmFpbHMtLTtcbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGMxOSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VudW1iZXJTa2VsZXRvbigpIHtcbiAgICAgICAgdmFyIHMwLCBzMSwgczI7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gW107XG4gICAgICAgIHMyID0gcGVnJHBhcnNlbnVtYmVyU2tlbGV0b25Ub2tlbigpO1xuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHdoaWxlIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHMxLnB1c2goczIpO1xuICAgICAgICAgICAgICAgIHMyID0gcGVnJHBhcnNlbnVtYmVyU2tlbGV0b25Ub2tlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMjEoczEpO1xuICAgICAgICB9XG4gICAgICAgIHMwID0gczE7XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlbnVtYmVyQXJnU3R5bGUoKSB7XG4gICAgICAgIHZhciBzMCwgczEsIHMyO1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKSA9PT0gcGVnJGMyMikge1xuICAgICAgICAgICAgczEgPSBwZWckYzIyO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzIzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMyID0gcGVnJHBhcnNlbnVtYmVyU2tlbGV0b24oKTtcbiAgICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHBlZyRzYXZlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMxID0gcGVnJGMyNChzMik7XG4gICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICBwZWckc2F2ZWRQb3MgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgIHMxID0gcGVnJGMyNSgpO1xuICAgICAgICAgICAgaWYgKHMxKSB7XG4gICAgICAgICAgICAgICAgczEgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMiA9IHBlZyRwYXJzZW1lc3NhZ2VUZXh0KCk7XG4gICAgICAgICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRzYXZlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMjYoczIpO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlbnVtYmVyRm9ybWF0RWxlbWVudCgpIHtcbiAgICAgICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczUsIHM2LCBzNywgczgsIHM5LCBzMTAsIHMxMSwgczEyO1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDEyMykge1xuICAgICAgICAgICAgczEgPSBwZWckYzY7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjNyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlYXJnTmFtZU9yTnVtYmVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNSA9IHBlZyRjMjc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMjgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA2KSA9PT0gcGVnJGMyOSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczcgPSBwZWckYzI5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzMwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM4ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczkgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMCA9IHBlZyRjMjc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzI4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczEwICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMSA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEyID0gcGVnJHBhcnNlbnVtYmVyQXJnU3R5bGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMTIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTAgPSBbczEwLCBzMTEsIHMxMl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczkgPSBzMTA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM5ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzOSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM5ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM5ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM5ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM5ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMCA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxMCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSAxMjUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTEgPSBwZWckYzg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMTEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckc2F2ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMzEoczMsIHM3LCBzOSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gczA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWRhdGVUaW1lU2tlbGV0b25MaXRlcmFsKCkge1xuICAgICAgICB2YXIgczAsIHMxLCBzMiwgczM7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gMzkpIHtcbiAgICAgICAgICAgIHMxID0gcGVnJGMzMjtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGMzMyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMiA9IFtdO1xuICAgICAgICAgICAgczMgPSBwZWckcGFyc2Vkb3VibGVBcG9zdHJvcGhlcygpO1xuICAgICAgICAgICAgaWYgKHMzID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRjMzQudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICBzMyA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMzUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHMyLnB1c2goczMpO1xuICAgICAgICAgICAgICAgICAgICBzMyA9IHBlZyRwYXJzZWRvdWJsZUFwb3N0cm9waGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzMyA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRjMzQudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMzID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGMzNSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSAzOSkge1xuICAgICAgICAgICAgICAgICAgICBzMyA9IHBlZyRjMzI7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMzMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBzMSA9IFtzMSwgczIsIHMzXTtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMCA9IFtdO1xuICAgICAgICAgICAgczEgPSBwZWckcGFyc2Vkb3VibGVBcG9zdHJvcGhlcygpO1xuICAgICAgICAgICAgaWYgKHMxID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRjMzYudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICBzMSA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMzcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHMwLnB1c2goczEpO1xuICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRwYXJzZWRvdWJsZUFwb3N0cm9waGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRjMzYudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGMzNyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlZGF0ZVRpbWVTa2VsZXRvblBhdHRlcm4oKSB7XG4gICAgICAgIHZhciBzMCwgczE7XG4gICAgICAgIHMwID0gW107XG4gICAgICAgIGlmIChwZWckYzM4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHMxID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGMzOSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICB3aGlsZSAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMC5wdXNoKHMxKTtcbiAgICAgICAgICAgICAgICBpZiAocGVnJGMzOC50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgIHMxID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGMzOSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VkYXRlVGltZVNrZWxldG9uKCkge1xuICAgICAgICB2YXIgczAsIHMxLCBzMiwgczM7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMyID0gW107XG4gICAgICAgIHMzID0gcGVnJHBhcnNlZGF0ZVRpbWVTa2VsZXRvbkxpdGVyYWwoKTtcbiAgICAgICAgaWYgKHMzID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMyA9IHBlZyRwYXJzZWRhdGVUaW1lU2tlbGV0b25QYXR0ZXJuKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICB3aGlsZSAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMi5wdXNoKHMzKTtcbiAgICAgICAgICAgICAgICBzMyA9IHBlZyRwYXJzZWRhdGVUaW1lU2tlbGV0b25MaXRlcmFsKCk7XG4gICAgICAgICAgICAgICAgaWYgKHMzID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlZGF0ZVRpbWVTa2VsZXRvblBhdHRlcm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMSA9IGlucHV0LnN1YnN0cmluZyhzMSwgcGVnJGN1cnJQb3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczEgPSBzMjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRzYXZlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzQwKHMxKTtcbiAgICAgICAgfVxuICAgICAgICBzMCA9IHMxO1xuICAgICAgICByZXR1cm4gczA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWRhdGVPclRpbWVBcmdTdHlsZSgpIHtcbiAgICAgICAgdmFyIHMwLCBzMSwgczI7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpID09PSBwZWckYzIyKSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMjI7XG4gICAgICAgICAgICBwZWckY3VyclBvcyArPSAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMjMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczIgPSBwZWckcGFyc2VkYXRlVGltZVNrZWxldG9uKCk7XG4gICAgICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBwZWckc2F2ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMjQoczIpO1xuICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICBzMSA9IHBlZyRjNDEoKTtcbiAgICAgICAgICAgIGlmIChzMSkge1xuICAgICAgICAgICAgICAgIHMxID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczIgPSBwZWckcGFyc2VtZXNzYWdlVGV4dCgpO1xuICAgICAgICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBwZWckc2F2ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczEgPSBwZWckYzI2KHMyKTtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gczA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWRhdGVPclRpbWVGb3JtYXRFbGVtZW50KCkge1xuICAgICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczYsIHM3LCBzOCwgczksIHMxMCwgczExLCBzMTI7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gMTIzKSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRjNjtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGM3KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczMgPSBwZWckcGFyc2VhcmdOYW1lT3JOdW1iZXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgczQgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0NCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJGMyNztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczUgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGMyOCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczYgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM2ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDQpID09PSBwZWckYzQyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNyA9IHBlZyRjNDI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczcgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjNDMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzNyA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNCkgPT09IHBlZyRjNDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNyA9IHBlZyRjNDQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjNDUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM4ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczkgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMCA9IHBlZyRjMjc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzI4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczEwICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMSA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEyID0gcGVnJHBhcnNlZGF0ZU9yVGltZUFyZ1N0eWxlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczEyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEwID0gW3MxMCwgczExLCBzMTJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM5ID0gczEwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzOTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzOSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczkgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHM5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzOSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzOSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzOSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzOSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTAgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMTAgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gMTI1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczExID0gcGVnJGM4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGM5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczExICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEgPSBwZWckYzMxKHMzLCBzNywgczkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VzaW1wbGVGb3JtYXRFbGVtZW50KCkge1xuICAgICAgICB2YXIgczA7XG4gICAgICAgIHMwID0gcGVnJHBhcnNlbnVtYmVyRm9ybWF0RWxlbWVudCgpO1xuICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMwID0gcGVnJHBhcnNlZGF0ZU9yVGltZUZvcm1hdEVsZW1lbnQoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gczA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXBsdXJhbEVsZW1lbnQoKSB7XG4gICAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1LCBzNiwgczcsIHM4LCBzOSwgczEwLCBzMTEsIHMxMiwgczEzLCBzMTQsIHMxNTtcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSAxMjMpIHtcbiAgICAgICAgICAgIHMxID0gcGVnJGM2O1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczIgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMyA9IHBlZyRwYXJzZWFyZ05hbWVPck51bWJlcigpO1xuICAgICAgICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBzNCA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczUgPSBwZWckYzI3O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzI4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNikgPT09IHBlZyRjNDYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJGM0NjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDY7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGM0Nyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM3ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAxMykgPT09IHBlZyRjNDgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNyA9IHBlZyRjNDg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMTM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzQ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzOCA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzOCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczkgPSBwZWckYzI3O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczkgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzI4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczkgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEwID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczEwICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTEgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDcpID09PSBwZWckYzUwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEyID0gcGVnJGM1MDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSA3O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjNTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMTIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTMgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTQgPSBwZWckcGFyc2VudW1iZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEyID0gW3MxMiwgczEzLCBzMTRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczExID0gczEyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMTE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMxMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczExID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMxMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczExICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEyID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMTIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxNCA9IHBlZyRwYXJzZXBsdXJhbE9wdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczE0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoczE0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEzLnB1c2goczE0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTQgPSBwZWckcGFyc2VwbHVyYWxPcHRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczE0ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gMTI1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxNSA9IHBlZyRjODtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxNSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjOSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckc2F2ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEgPSBwZWckYzUyKHMzLCBzNywgczExLCBzMTMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gczA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZXNlbGVjdEVsZW1lbnQoKSB7XG4gICAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1LCBzNiwgczcsIHM4LCBzOSwgczEwLCBzMTEsIHMxMiwgczEzO1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDEyMykge1xuICAgICAgICAgICAgczEgPSBwZWckYzY7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjNyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlYXJnTmFtZU9yTnVtYmVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNSA9IHBlZyRjMjc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMjgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA2KSA9PT0gcGVnJGM1Mykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczcgPSBwZWckYzUzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzU0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczcgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM4ID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM4ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0NCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzOSA9IHBlZyRjMjc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzOSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMjgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzOSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTAgPSBwZWckcGFyc2VfKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMTAgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEyID0gcGVnJHBhcnNlc2VsZWN0T3B0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczEyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHMxMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTEucHVzaChzMTIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTIgPSBwZWckcGFyc2VzZWxlY3RPcHRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxMiA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczEyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gMTI1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTMgPSBwZWckYzg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEzID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMTMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRzYXZlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczEgPSBwZWckYzU1KHMzLCBzMTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VwbHVyYWxSdWxlU2VsZWN0VmFsdWUoKSB7XG4gICAgICAgIHZhciBzMCwgczEsIHMyLCBzMztcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgczEgPSBwZWckY3VyclBvcztcbiAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA2MSkge1xuICAgICAgICAgICAgczIgPSBwZWckYzU2O1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzU3KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlbnVtYmVyKCk7XG4gICAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMiA9IFtzMiwgczNdO1xuICAgICAgICAgICAgICAgIHMxID0gczI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczE7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMCA9IGlucHV0LnN1YnN0cmluZyhzMCwgcGVnJGN1cnJQb3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMwID0gcGVnJHBhcnNlYXJnTmFtZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlc2VsZWN0T3B0aW9uKCkge1xuICAgICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNSwgczYsIHM3O1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBzMSA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRwYXJzZWFyZ05hbWUoKTtcbiAgICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHMzID0gcGVnJHBhcnNlXygpO1xuICAgICAgICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDEyMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgczQgPSBwZWckYzY7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjNyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckc2F2ZWRQb3MgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJGM1OChzMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoczUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM2ID0gcGVnJHBhcnNlbWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzNiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDEyNSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczcgPSBwZWckYzg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczcgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjOSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckc2F2ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMxID0gcGVnJGM1OShzMiwgczYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VwbHVyYWxPcHRpb24oKSB7XG4gICAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1LCBzNiwgczc7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gcGVnJHBhcnNlXygpO1xuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMyID0gcGVnJHBhcnNlcGx1cmFsUnVsZVNlbGVjdFZhbHVlKCk7XG4gICAgICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMyA9IHBlZyRwYXJzZV8oKTtcbiAgICAgICAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSAxMjMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJGM2O1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICBzNSA9IHBlZyRjNjAoczIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHM1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgczUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoczUgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZW1lc3NhZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSAxMjUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJGM4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM3ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzNyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjNjEoczIsIHM2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNld2hpdGVTcGFjZSgpIHtcbiAgICAgICAgdmFyIHMwLCBzMTtcbiAgICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICAgIGlmIChwZWckYzYzLnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHMwID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGM2NCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjNjIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlcGF0dGVyblN5bnRheCgpIHtcbiAgICAgICAgdmFyIHMwLCBzMTtcbiAgICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICAgIGlmIChwZWckYzY2LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgIHMwID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGM2Nyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjNjUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlXygpIHtcbiAgICAgICAgdmFyIHMwLCBzMSwgczI7XG4gICAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBzMSA9IFtdO1xuICAgICAgICBzMiA9IHBlZyRwYXJzZXdoaXRlU3BhY2UoKTtcbiAgICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgICAgIHMyID0gcGVnJHBhcnNld2hpdGVTcGFjZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczAgPSBpbnB1dC5zdWJzdHJpbmcoczAsIHBlZyRjdXJyUG9zKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgIH1cbiAgICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjNjgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlbnVtYmVyKCkge1xuICAgICAgICB2YXIgczAsIHMxLCBzMjtcbiAgICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDUpIHtcbiAgICAgICAgICAgIHMxID0gcGVnJGM3MDtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGM3MSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMiA9IHBlZyRwYXJzZWFyZ051bWJlcigpO1xuICAgICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczEgPSBwZWckYzcyKHMxLCBzMik7XG4gICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgfVxuICAgICAgICBwZWckc2lsZW50RmFpbHMtLTtcbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGM2OSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VhcG9zdHJvcGhlKCkge1xuICAgICAgICB2YXIgczAsIHMxO1xuICAgICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSAzOSkge1xuICAgICAgICAgICAgczAgPSBwZWckYzMyO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzMzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwZWckc2lsZW50RmFpbHMtLTtcbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGM3Myk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckcGFyc2Vkb3VibGVBcG9zdHJvcGhlcygpIHtcbiAgICAgICAgdmFyIHMwLCBzMTtcbiAgICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpID09PSBwZWckYzc1KSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRjNzU7XG4gICAgICAgICAgICBwZWckY3VyclBvcyArPSAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjNzYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gczA7XG4gICAgICAgICAgICBzMSA9IHBlZyRjNzcoKTtcbiAgICAgICAgfVxuICAgICAgICBzMCA9IHMxO1xuICAgICAgICBwZWckc2lsZW50RmFpbHMtLTtcbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGM3NCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VxdW90ZWRTdHJpbmcoKSB7XG4gICAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQsIHM1O1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDM5KSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRjMzI7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMzMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczIgPSBwZWckcGFyc2Vlc2NhcGVkQ2hhcigpO1xuICAgICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczMgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgICAgICBzNCA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDIpID09PSBwZWckYzc1KSB7XG4gICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJGM3NTtcbiAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGM3Nik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHM1ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWckYzM0LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHM1ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzNSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGMzNSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgd2hpbGUgKHM1ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM0LnB1c2goczUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCAyKSA9PT0gcGVnJGM3NSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgczUgPSBwZWckYzc1O1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzc2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoczUgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckYzM0LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzNSA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHM1ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMzUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgczMgPSBpbnB1dC5zdWJzdHJpbmcoczMsIHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHMzID0gczQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDM5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzNCA9IHBlZyRjMzI7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgczQgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMzMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzNCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgczQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjNzgoczIsIHMzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNldW5xdW90ZWRTdHJpbmcoKSB7XG4gICAgICAgIHZhciBzMCwgczEsIHMyLCBzMztcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgczEgPSBwZWckY3VyclBvcztcbiAgICAgICAgaWYgKGlucHV0Lmxlbmd0aCA+IHBlZyRjdXJyUG9zKSB7XG4gICAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjMTQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgcGVnJHNhdmVkUG9zID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICBzMyA9IHBlZyRjNzkoczIpO1xuICAgICAgICAgICAgaWYgKHMzKSB7XG4gICAgICAgICAgICAgICAgczMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMiA9IFtzMiwgczNdO1xuICAgICAgICAgICAgICAgIHMxID0gczI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczE7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDEwKSB7XG4gICAgICAgICAgICAgICAgczEgPSBwZWckYzgwO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzgxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMCA9IGlucHV0LnN1YnN0cmluZyhzMCwgcGVnJGN1cnJQb3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gczA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWVzY2FwZWRDaGFyKCkge1xuICAgICAgICB2YXIgczAsIHMxLCBzMiwgczM7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIHMxID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIGlmIChpbnB1dC5sZW5ndGggPiBwZWckY3VyclBvcykge1xuICAgICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzE0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRzYXZlZFBvcyA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgczMgPSBwZWckYzgyKHMyKTtcbiAgICAgICAgICAgIGlmIChzMykge1xuICAgICAgICAgICAgICAgIHMzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgczIgPSBbczIsIHMzXTtcbiAgICAgICAgICAgICAgICBzMSA9IHMyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMTtcbiAgICAgICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczAgPSBpbnB1dC5zdWJzdHJpbmcoczAsIHBlZyRjdXJyUG9zKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwZWckcGFyc2VhcmdOYW1lT3JOdW1iZXIoKSB7XG4gICAgICAgIHZhciBzMCwgczE7XG4gICAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBzMSA9IHBlZyRwYXJzZWFyZ051bWJlcigpO1xuICAgICAgICBpZiAoczEgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMxID0gcGVnJHBhcnNlYXJnTmFtZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczAgPSBpbnB1dC5zdWJzdHJpbmcoczAsIHBlZyRjdXJyUG9zKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHMwID0gczE7XG4gICAgICAgIH1cbiAgICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjODMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGVnJHBhcnNlYXJnTnVtYmVyKCkge1xuICAgICAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0O1xuICAgICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0OCkge1xuICAgICAgICAgICAgczEgPSBwZWckYzg1O1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzg2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHBlZyRzYXZlZFBvcyA9IHMwO1xuICAgICAgICAgICAgczEgPSBwZWckYzg3KCk7XG4gICAgICAgIH1cbiAgICAgICAgczAgPSBzMTtcbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgczEgPSBwZWckY3VyclBvcztcbiAgICAgICAgICAgIGlmIChwZWckYzg4LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjODkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHMzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRjOTAudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICBzNCA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRjOTEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHdoaWxlIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBzMy5wdXNoKHM0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRjOTAudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzkxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgczIgPSBbczIsIHMzXTtcbiAgICAgICAgICAgICAgICAgICAgczEgPSBzMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczE7XG4gICAgICAgICAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMxO1xuICAgICAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIHBlZyRzYXZlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMxID0gcGVnJGM5MihzMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICB9XG4gICAgICAgIHBlZyRzaWxlbnRGYWlscy0tO1xuICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzg0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gczA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBlZyRwYXJzZWFyZ05hbWUoKSB7XG4gICAgICAgIHZhciBzMCwgczEsIHMyLCBzMywgczQ7XG4gICAgICAgIHBlZyRzaWxlbnRGYWlscysrO1xuICAgICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBzMSA9IFtdO1xuICAgICAgICBzMiA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBzMyA9IHBlZyRjdXJyUG9zO1xuICAgICAgICBwZWckc2lsZW50RmFpbHMrKztcbiAgICAgICAgczQgPSBwZWckcGFyc2V3aGl0ZVNwYWNlKCk7XG4gICAgICAgIGlmIChzNCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczQgPSBwZWckcGFyc2VwYXR0ZXJuU3ludGF4KCk7XG4gICAgICAgIH1cbiAgICAgICAgcGVnJHNpbGVudEZhaWxzLS07XG4gICAgICAgIGlmIChzNCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczMgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgaWYgKGlucHV0Lmxlbmd0aCA+IHBlZyRjdXJyUG9zKSB7XG4gICAgICAgICAgICAgICAgczQgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBwZWckZmFpbChwZWckYzE0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoczQgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMyA9IFtzMywgczRdO1xuICAgICAgICAgICAgICAgIHMyID0gczM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMyO1xuICAgICAgICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzMS5wdXNoKHMyKTtcbiAgICAgICAgICAgICAgICBzMiA9IHBlZyRjdXJyUG9zO1xuICAgICAgICAgICAgICAgIHMzID0gcGVnJGN1cnJQb3M7XG4gICAgICAgICAgICAgICAgcGVnJHNpbGVudEZhaWxzKys7XG4gICAgICAgICAgICAgICAgczQgPSBwZWckcGFyc2V3aGl0ZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgaWYgKHM0ID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIHM0ID0gcGVnJHBhcnNlcGF0dGVyblN5bnRheCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwZWckc2lsZW50RmFpbHMtLTtcbiAgICAgICAgICAgICAgICBpZiAoczQgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgczMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMzO1xuICAgICAgICAgICAgICAgICAgICBzMyA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQubGVuZ3RoID4gcGVnJGN1cnJQb3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHM0ID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzNCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGMxNCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzMyA9IFtzMywgczRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgczIgPSBzMztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgICAgICAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczI7XG4gICAgICAgICAgICAgICAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMCA9IGlucHV0LnN1YnN0cmluZyhzMCwgcGVnJGN1cnJQb3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgfVxuICAgICAgICBwZWckc2lsZW50RmFpbHMtLTtcbiAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcGVnJGZhaWwocGVnJGM5Myk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMwO1xuICAgIH1cbiAgICB2YXIgbWVzc2FnZUN0eCA9IFsncm9vdCddO1xuICAgIGZ1bmN0aW9uIGlzTmVzdGVkTWVzc2FnZVRleHQoKSB7XG4gICAgICAgIHJldHVybiBtZXNzYWdlQ3R4Lmxlbmd0aCA+IDE7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzSW5QbHVyYWxPcHRpb24oKSB7XG4gICAgICAgIHJldHVybiBtZXNzYWdlQ3R4W21lc3NhZ2VDdHgubGVuZ3RoIC0gMV0gPT09ICdwbHVyYWwnO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbnNlcnRMb2NhdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMgJiYgb3B0aW9ucy5jYXB0dXJlTG9jYXRpb24gPyB7XG4gICAgICAgICAgICBsb2NhdGlvbjogbG9jYXRpb24oKVxuICAgICAgICB9IDoge307XG4gICAgfVxuICAgIHBlZyRyZXN1bHQgPSBwZWckc3RhcnRSdWxlRnVuY3Rpb24oKTtcbiAgICBpZiAocGVnJHJlc3VsdCAhPT0gcGVnJEZBSUxFRCAmJiBwZWckY3VyclBvcyA9PT0gaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBwZWckcmVzdWx0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKHBlZyRyZXN1bHQgIT09IHBlZyRGQUlMRUQgJiYgcGVnJGN1cnJQb3MgPCBpbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBlZyRmYWlsKHBlZyRlbmRFeHBlY3RhdGlvbigpKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBwZWckYnVpbGRTdHJ1Y3R1cmVkRXJyb3IocGVnJG1heEZhaWxFeHBlY3RlZCwgcGVnJG1heEZhaWxQb3MgPCBpbnB1dC5sZW5ndGggPyBpbnB1dC5jaGFyQXQocGVnJG1heEZhaWxQb3MpIDogbnVsbCwgcGVnJG1heEZhaWxQb3MgPCBpbnB1dC5sZW5ndGhcbiAgICAgICAgICAgID8gcGVnJGNvbXB1dGVMb2NhdGlvbihwZWckbWF4RmFpbFBvcywgcGVnJG1heEZhaWxQb3MgKyAxKVxuICAgICAgICAgICAgOiBwZWckY29tcHV0ZUxvY2F0aW9uKHBlZyRtYXhGYWlsUG9zLCBwZWckbWF4RmFpbFBvcykpO1xuICAgIH1cbn1cbmV4cG9ydCB2YXIgcGVnUGFyc2UgPSBwZWckcGFyc2U7XG4iLCJ2YXIgX19zcHJlYWRBcnJheXMgPSAodGhpcyAmJiB0aGlzLl9fc3ByZWFkQXJyYXlzKSB8fCBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgcyA9IDAsIGkgPSAwLCBpbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpbDsgaSsrKSBzICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XG4gICAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcbiAgICAgICAgICAgIHJba10gPSBhW2pdO1xuICAgIHJldHVybiByO1xufTtcbmltcG9ydCB7IGlzUGx1cmFsRWxlbWVudCwgaXNMaXRlcmFsRWxlbWVudCwgaXNTZWxlY3RFbGVtZW50LCB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgcGVnUGFyc2UgfSBmcm9tICcuL3BhcnNlcic7XG52YXIgUExVUkFMX0hBU0hUQUdfUkVHRVggPSAvKF58W15cXFxcXSkjL2c7XG4vKipcbiAqIFdoZXRoZXIgdG8gY29udmVydCBgI2AgaW4gcGx1cmFsIHJ1bGUgb3B0aW9uc1xuICogdG8gYHt2YXIsIG51bWJlcn1gXG4gKiBAcGFyYW0gZWwgQVNUIEVsZW1lbnRcbiAqIEBwYXJhbSBwbHVyYWxTdGFjayBjdXJyZW50IHBsdXJhbCBzdGFja1xuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplSGFzaHRhZ0luUGx1cmFsKGVscykge1xuICAgIGVscy5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAvLyBJZiB3ZSdyZSBlbmNvdW50ZXJpbmcgYSBwbHVyYWwgZWxcbiAgICAgICAgaWYgKCFpc1BsdXJhbEVsZW1lbnQoZWwpICYmICFpc1NlbGVjdEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gR28gZG93biB0aGUgb3B0aW9ucyBhbmQgc2VhcmNoIGZvciAjIGluIGFueSBsaXRlcmFsIGVsZW1lbnRcbiAgICAgICAgT2JqZWN0LmtleXMoZWwub3B0aW9ucykuZm9yRWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgIHZhciBfYTtcbiAgICAgICAgICAgIHZhciBvcHQgPSBlbC5vcHRpb25zW2lkXTtcbiAgICAgICAgICAgIC8vIElmIHdlIGdvdCBhIG1hdGNoLCB3ZSBoYXZlIHRvIHNwbGl0IHRoaXNcbiAgICAgICAgICAgIC8vIGFuZCBpbmplY3QgYSBOdW1iZXJFbGVtZW50IGluIHRoZSBtaWRkbGVcbiAgICAgICAgICAgIHZhciBtYXRjaGluZ0xpdGVyYWxFbEluZGV4ID0gLTE7XG4gICAgICAgICAgICB2YXIgbGl0ZXJhbEVsID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcHQudmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZWxfMSA9IG9wdC52YWx1ZVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaXRlcmFsRWxlbWVudChlbF8xKSAmJiBQTFVSQUxfSEFTSFRBR19SRUdFWC50ZXN0KGVsXzEudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoaW5nTGl0ZXJhbEVsSW5kZXggPSBpO1xuICAgICAgICAgICAgICAgICAgICBsaXRlcmFsRWwgPSBlbF8xO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGl0ZXJhbEVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gbGl0ZXJhbEVsLnZhbHVlLnJlcGxhY2UoUExVUkFMX0hBU0hUQUdfUkVHRVgsIFwiJDF7XCIgKyBlbC52YWx1ZSArIFwiLCBudW1iZXJ9XCIpO1xuICAgICAgICAgICAgICAgIHZhciBuZXdFbHMgPSBwZWdQYXJzZShuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgICAgKF9hID0gb3B0LnZhbHVlKS5zcGxpY2UuYXBwbHkoX2EsIF9fc3ByZWFkQXJyYXlzKFttYXRjaGluZ0xpdGVyYWxFbEluZGV4LCAxXSwgbmV3RWxzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub3JtYWxpemVIYXNodGFnSW5QbHVyYWwob3B0LnZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4iLCJ2YXIgX19hc3NpZ24gPSAodGhpcyAmJiB0aGlzLl9fYXNzaWduKSB8fCBmdW5jdGlvbiAoKSB7XG4gICAgX19hc3NpZ24gPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKVxuICAgICAgICAgICAgICAgIHRbcF0gPSBzW3BdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0O1xuICAgIH07XG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuLyoqXG4gKiBodHRwczovL3VuaWNvZGUub3JnL3JlcG9ydHMvdHIzNS90cjM1LWRhdGVzLmh0bWwjRGF0ZV9GaWVsZF9TeW1ib2xfVGFibGVcbiAqIENyZWRpdDogaHR0cHM6Ly9naXRodWIuY29tL2NhcmlkeS9pbnRsLWRhdGV0aW1lZm9ybWF0LXBhdHRlcm4vYmxvYi9tYXN0ZXIvaW5kZXguanNcbiAqIHdpdGggc29tZSB0d2Vha3NcbiAqL1xudmFyIERBVEVfVElNRV9SRUdFWCA9IC8oPzpbRWVjXXsxLDZ9fEd7MSw1fXxbUXFdezEsNX18KD86W3lZdXJdK3xVezEsNX0pfFtNTF17MSw1fXxkezEsMn18RHsxLDN9fEZ7MX18W2FiQl17MSw1fXxbaGtIS117MSwyfXx3ezEsMn18V3sxfXxtezEsMn18c3sxLDJ9fFt6Wk92VnhYXXsxLDR9KSg/PShbXiddKidbXiddKicpKlteJ10qJCkvZztcbi8qKlxuICogUGFyc2UgRGF0ZSB0aW1lIHNrZWxldG9uIGludG8gSW50bC5EYXRlVGltZUZvcm1hdE9wdGlvbnNcbiAqIFJlZjogaHR0cHM6Ly91bmljb2RlLm9yZy9yZXBvcnRzL3RyMzUvdHIzNS1kYXRlcy5odG1sI0RhdGVfRmllbGRfU3ltYm9sX1RhYmxlXG4gKiBAcHVibGljXG4gKiBAcGFyYW0gc2tlbGV0b24gc2tlbGV0b24gc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZURhdGVUaW1lU2tlbGV0b24oc2tlbGV0b24pIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgc2tlbGV0b24ucmVwbGFjZShEQVRFX1RJTUVfUkVHRVgsIGZ1bmN0aW9uIChtYXRjaCkge1xuICAgICAgICB2YXIgbGVuID0gbWF0Y2gubGVuZ3RoO1xuICAgICAgICBzd2l0Y2ggKG1hdGNoWzBdKSB7XG4gICAgICAgICAgICAvLyBFcmFcbiAgICAgICAgICAgIGNhc2UgJ0cnOlxuICAgICAgICAgICAgICAgIHJlc3VsdC5lcmEgPSBsZW4gPT09IDQgPyAnbG9uZycgOiBsZW4gPT09IDUgPyAnbmFycm93JyA6ICdzaG9ydCc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAvLyBZZWFyXG4gICAgICAgICAgICBjYXNlICd5JzpcbiAgICAgICAgICAgICAgICByZXN1bHQueWVhciA9IGxlbiA9PT0gMiA/ICcyLWRpZ2l0JyA6ICdudW1lcmljJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1knOlxuICAgICAgICAgICAgY2FzZSAndSc6XG4gICAgICAgICAgICBjYXNlICdVJzpcbiAgICAgICAgICAgIGNhc2UgJ3InOlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdgWS91L1UvcmAgKHllYXIpIHBhdHRlcm5zIGFyZSBub3Qgc3VwcG9ydGVkLCB1c2UgYHlgIGluc3RlYWQnKTtcbiAgICAgICAgICAgIC8vIFF1YXJ0ZXJcbiAgICAgICAgICAgIGNhc2UgJ3EnOlxuICAgICAgICAgICAgY2FzZSAnUSc6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2BxL1FgIChxdWFydGVyKSBwYXR0ZXJucyBhcmUgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgICAgICAgLy8gTW9udGhcbiAgICAgICAgICAgIGNhc2UgJ00nOlxuICAgICAgICAgICAgY2FzZSAnTCc6XG4gICAgICAgICAgICAgICAgcmVzdWx0Lm1vbnRoID0gWydudW1lcmljJywgJzItZGlnaXQnLCAnc2hvcnQnLCAnbG9uZycsICduYXJyb3cnXVtsZW4gLSAxXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIC8vIFdlZWtcbiAgICAgICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICAgICAgY2FzZSAnVyc6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2B3L1dgICh3ZWVrKSBwYXR0ZXJucyBhcmUgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgICAgICAgY2FzZSAnZCc6XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRheSA9IFsnbnVtZXJpYycsICcyLWRpZ2l0J11bbGVuIC0gMV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdEJzpcbiAgICAgICAgICAgIGNhc2UgJ0YnOlxuICAgICAgICAgICAgY2FzZSAnZyc6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2BEL0YvZ2AgKGRheSkgcGF0dGVybnMgYXJlIG5vdCBzdXBwb3J0ZWQsIHVzZSBgZGAgaW5zdGVhZCcpO1xuICAgICAgICAgICAgLy8gV2Vla2RheVxuICAgICAgICAgICAgY2FzZSAnRSc6XG4gICAgICAgICAgICAgICAgcmVzdWx0LndlZWtkYXkgPSBsZW4gPT09IDQgPyAnc2hvcnQnIDogbGVuID09PSA1ID8gJ25hcnJvdycgOiAnc2hvcnQnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZSc6XG4gICAgICAgICAgICAgICAgaWYgKGxlbiA8IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2BlLi5lZWVgICh3ZWVrZGF5KSBwYXR0ZXJucyBhcmUgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQud2Vla2RheSA9IFsnc2hvcnQnLCAnbG9uZycsICduYXJyb3cnLCAnc2hvcnQnXVtsZW4gLSA0XTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2MnOlxuICAgICAgICAgICAgICAgIGlmIChsZW4gPCA0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdgYy4uY2NjYCAod2Vla2RheSkgcGF0dGVybnMgYXJlIG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0LndlZWtkYXkgPSBbJ3Nob3J0JywgJ2xvbmcnLCAnbmFycm93JywgJ3Nob3J0J11bbGVuIC0gNF07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAvLyBQZXJpb2RcbiAgICAgICAgICAgIGNhc2UgJ2EnOiAvLyBBTSwgUE1cbiAgICAgICAgICAgICAgICByZXN1bHQuaG91cjEyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2InOiAvLyBhbSwgcG0sIG5vb24sIG1pZG5pZ2h0XG4gICAgICAgICAgICBjYXNlICdCJzogLy8gZmxleGlibGUgZGF5IHBlcmlvZHNcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignYGIvQmAgKHBlcmlvZCkgcGF0dGVybnMgYXJlIG5vdCBzdXBwb3J0ZWQsIHVzZSBgYWAgaW5zdGVhZCcpO1xuICAgICAgICAgICAgLy8gSG91clxuICAgICAgICAgICAgY2FzZSAnaCc6XG4gICAgICAgICAgICAgICAgcmVzdWx0LmhvdXJDeWNsZSA9ICdoMTInO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5ob3VyID0gWydudW1lcmljJywgJzItZGlnaXQnXVtsZW4gLSAxXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ0gnOlxuICAgICAgICAgICAgICAgIHJlc3VsdC5ob3VyQ3ljbGUgPSAnaDIzJztcbiAgICAgICAgICAgICAgICByZXN1bHQuaG91ciA9IFsnbnVtZXJpYycsICcyLWRpZ2l0J11bbGVuIC0gMV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdLJzpcbiAgICAgICAgICAgICAgICByZXN1bHQuaG91ckN5Y2xlID0gJ2gxMSc7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmhvdXIgPSBbJ251bWVyaWMnLCAnMi1kaWdpdCddW2xlbiAtIDFdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnayc6XG4gICAgICAgICAgICAgICAgcmVzdWx0LmhvdXJDeWNsZSA9ICdoMjQnO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5ob3VyID0gWydudW1lcmljJywgJzItZGlnaXQnXVtsZW4gLSAxXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2onOlxuICAgICAgICAgICAgY2FzZSAnSic6XG4gICAgICAgICAgICBjYXNlICdDJzpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignYGovSi9DYCAoaG91cikgcGF0dGVybnMgYXJlIG5vdCBzdXBwb3J0ZWQsIHVzZSBgaC9IL0sva2AgaW5zdGVhZCcpO1xuICAgICAgICAgICAgLy8gTWludXRlXG4gICAgICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgICAgICAgICByZXN1bHQubWludXRlID0gWydudW1lcmljJywgJzItZGlnaXQnXVtsZW4gLSAxXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIC8vIFNlY29uZFxuICAgICAgICAgICAgY2FzZSAncyc6XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNlY29uZCA9IFsnbnVtZXJpYycsICcyLWRpZ2l0J11bbGVuIC0gMV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdTJzpcbiAgICAgICAgICAgIGNhc2UgJ0EnOlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdgUy9BYCAoc2Vjb25kKSBwYXR0ZW5ycyBhcmUgbm90IHN1cHBvcnRlZCwgdXNlIGBzYCBpbnN0ZWFkJyk7XG4gICAgICAgICAgICAvLyBab25lXG4gICAgICAgICAgICBjYXNlICd6JzogLy8gMS4uMywgNDogc3BlY2lmaWMgbm9uLWxvY2F0aW9uIGZvcm1hdFxuICAgICAgICAgICAgICAgIHJlc3VsdC50aW1lWm9uZU5hbWUgPSBsZW4gPCA0ID8gJ3Nob3J0JyA6ICdsb25nJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1onOiAvLyAxLi4zLCA0LCA1OiBUaGUgSVNPODYwMSB2YXJpb3MgZm9ybWF0c1xuICAgICAgICAgICAgY2FzZSAnTyc6IC8vIDEsIDQ6IG1pbGlzZWNvbmRzIGluIGRheSBzaG9ydCwgbG9uZ1xuICAgICAgICAgICAgY2FzZSAndic6IC8vIDEsIDQ6IGdlbmVyaWMgbm9uLWxvY2F0aW9uIGZvcm1hdFxuICAgICAgICAgICAgY2FzZSAnVic6IC8vIDEsIDIsIDMsIDQ6IHRpbWUgem9uZSBJRCBvciBjaXR5XG4gICAgICAgICAgICBjYXNlICdYJzogLy8gMSwgMiwgMywgNDogVGhlIElTTzg2MDEgdmFyaW9zIGZvcm1hdHNcbiAgICAgICAgICAgIGNhc2UgJ3gnOiAvLyAxLCAyLCAzLCA0OiBUaGUgSVNPODYwMSB2YXJpb3MgZm9ybWF0c1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdgWi9PL3YvVi9YL3hgICh0aW1lWm9uZSkgcGF0dGVucnMgYXJlIG5vdCBzdXBwb3J0ZWQsIHVzZSBgemAgaW5zdGVhZCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gaWN1VW5pdFRvRWNtYSh1bml0KSB7XG4gICAgcmV0dXJuIHVuaXQucmVwbGFjZSgvXiguKj8pLS8sICcnKTtcbn1cbnZhciBGUkFDVElPTl9QUkVDSVNJT05fUkVHRVggPSAvXlxcLig/OigwKykoXFwrfCMrKT8pPyQvZztcbnZhciBTSUdOSUZJQ0FOVF9QUkVDSVNJT05fUkVHRVggPSAvXihAKyk/KFxcK3wjKyk/JC9nO1xuZnVuY3Rpb24gcGFyc2VTaWduaWZpY2FudFByZWNpc2lvbihzdHIpIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgc3RyLnJlcGxhY2UoU0lHTklGSUNBTlRfUFJFQ0lTSU9OX1JFR0VYLCBmdW5jdGlvbiAoXywgZzEsIGcyKSB7XG4gICAgICAgIC8vIEBAQCBjYXNlXG4gICAgICAgIGlmICh0eXBlb2YgZzIgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXN1bHQubWluaW11bVNpZ25pZmljYW50RGlnaXRzID0gZzEubGVuZ3RoO1xuICAgICAgICAgICAgcmVzdWx0Lm1heGltdW1TaWduaWZpY2FudERpZ2l0cyA9IGcxLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICAvLyBAQEArIGNhc2VcbiAgICAgICAgZWxzZSBpZiAoZzIgPT09ICcrJykge1xuICAgICAgICAgICAgcmVzdWx0Lm1pbmltdW1TaWduaWZpY2FudERpZ2l0cyA9IGcxLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICAvLyAuIyMjIGNhc2VcbiAgICAgICAgZWxzZSBpZiAoZzFbMF0gPT09ICcjJykge1xuICAgICAgICAgICAgcmVzdWx0Lm1heGltdW1TaWduaWZpY2FudERpZ2l0cyA9IGcxLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICAvLyAuQEAjIyBvciAuQEBAIGNhc2VcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQubWluaW11bVNpZ25pZmljYW50RGlnaXRzID0gZzEubGVuZ3RoO1xuICAgICAgICAgICAgcmVzdWx0Lm1heGltdW1TaWduaWZpY2FudERpZ2l0cyA9XG4gICAgICAgICAgICAgICAgZzEubGVuZ3RoICsgKHR5cGVvZiBnMiA9PT0gJ3N0cmluZycgPyBnMi5sZW5ndGggOiAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmZ1bmN0aW9uIHBhcnNlU2lnbihzdHIpIHtcbiAgICBzd2l0Y2ggKHN0cikge1xuICAgICAgICBjYXNlICdzaWduLWF1dG8nOlxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzaWduRGlzcGxheTogJ2F1dG8nLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgY2FzZSAnc2lnbi1hY2NvdW50aW5nJzpcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgY3VycmVuY3lTaWduOiAnYWNjb3VudGluZycsXG4gICAgICAgICAgICB9O1xuICAgICAgICBjYXNlICdzaWduLWFsd2F5cyc6XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNpZ25EaXNwbGF5OiAnYWx3YXlzJyxcbiAgICAgICAgICAgIH07XG4gICAgICAgIGNhc2UgJ3NpZ24tYWNjb3VudGluZy1hbHdheXMnOlxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzaWduRGlzcGxheTogJ2Fsd2F5cycsXG4gICAgICAgICAgICAgICAgY3VycmVuY3lTaWduOiAnYWNjb3VudGluZycsXG4gICAgICAgICAgICB9O1xuICAgICAgICBjYXNlICdzaWduLWV4Y2VwdC16ZXJvJzpcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2lnbkRpc3BsYXk6ICdleGNlcHRaZXJvJyxcbiAgICAgICAgICAgIH07XG4gICAgICAgIGNhc2UgJ3NpZ24tYWNjb3VudGluZy1leGNlcHQtemVybyc6XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNpZ25EaXNwbGF5OiAnZXhjZXB0WmVybycsXG4gICAgICAgICAgICAgICAgY3VycmVuY3lTaWduOiAnYWNjb3VudGluZycsXG4gICAgICAgICAgICB9O1xuICAgICAgICBjYXNlICdzaWduLW5ldmVyJzpcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2lnbkRpc3BsYXk6ICduZXZlcicsXG4gICAgICAgICAgICB9O1xuICAgIH1cbn1cbmZ1bmN0aW9uIHBhcnNlTm90YXRpb25PcHRpb25zKG9wdCkge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB2YXIgc2lnbk9wdHMgPSBwYXJzZVNpZ24ob3B0KTtcbiAgICBpZiAoc2lnbk9wdHMpIHtcbiAgICAgICAgcmV0dXJuIHNpZ25PcHRzO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuLyoqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vdW5pY29kZS1vcmcvaWN1L2Jsb2IvbWFzdGVyL2RvY3MvdXNlcmd1aWRlL2Zvcm1hdF9wYXJzZS9udW1iZXJzL3NrZWxldG9ucy5tZCNza2VsZXRvbi1zdGVtcy1hbmQtb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydE51bWJlclNrZWxldG9uVG9OdW1iZXJGb3JtYXRPcHRpb25zKHRva2Vucykge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBfaSA9IDAsIHRva2Vuc18xID0gdG9rZW5zOyBfaSA8IHRva2Vuc18xLmxlbmd0aDsgX2krKykge1xuICAgICAgICB2YXIgdG9rZW4gPSB0b2tlbnNfMVtfaV07XG4gICAgICAgIHN3aXRjaCAodG9rZW4uc3RlbSkge1xuICAgICAgICAgICAgY2FzZSAncGVyY2VudCc6XG4gICAgICAgICAgICAgICAgcmVzdWx0LnN0eWxlID0gJ3BlcmNlbnQnO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgY2FzZSAnY3VycmVuY3knOlxuICAgICAgICAgICAgICAgIHJlc3VsdC5zdHlsZSA9ICdjdXJyZW5jeSc7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmN1cnJlbmN5ID0gdG9rZW4ub3B0aW9uc1swXTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGNhc2UgJ2dyb3VwLW9mZic6XG4gICAgICAgICAgICAgICAgcmVzdWx0LnVzZUdyb3VwaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBjYXNlICdwcmVjaXNpb24taW50ZWdlcic6XG4gICAgICAgICAgICAgICAgcmVzdWx0Lm1heGltdW1GcmFjdGlvbkRpZ2l0cyA9IDA7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBjYXNlICdtZWFzdXJlLXVuaXQnOlxuICAgICAgICAgICAgICAgIHJlc3VsdC5zdHlsZSA9ICd1bml0JztcbiAgICAgICAgICAgICAgICByZXN1bHQudW5pdCA9IGljdVVuaXRUb0VjbWEodG9rZW4ub3B0aW9uc1swXSk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBjYXNlICdjb21wYWN0LXNob3J0JzpcbiAgICAgICAgICAgICAgICByZXN1bHQubm90YXRpb24gPSAnY29tcGFjdCc7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvbXBhY3REaXNwbGF5ID0gJ3Nob3J0JztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGNhc2UgJ2NvbXBhY3QtbG9uZyc6XG4gICAgICAgICAgICAgICAgcmVzdWx0Lm5vdGF0aW9uID0gJ2NvbXBhY3QnO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5jb21wYWN0RGlzcGxheSA9ICdsb25nJztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGNhc2UgJ3NjaWVudGlmaWMnOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IF9fYXNzaWduKF9fYXNzaWduKF9fYXNzaWduKHt9LCByZXN1bHQpLCB7IG5vdGF0aW9uOiAnc2NpZW50aWZpYycgfSksIHRva2VuLm9wdGlvbnMucmVkdWNlKGZ1bmN0aW9uIChhbGwsIG9wdCkgeyByZXR1cm4gKF9fYXNzaWduKF9fYXNzaWduKHt9LCBhbGwpLCBwYXJzZU5vdGF0aW9uT3B0aW9ucyhvcHQpKSk7IH0sIHt9KSk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBjYXNlICdlbmdpbmVlcmluZyc6XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gX19hc3NpZ24oX19hc3NpZ24oX19hc3NpZ24oe30sIHJlc3VsdCksIHsgbm90YXRpb246ICdlbmdpbmVlcmluZycgfSksIHRva2VuLm9wdGlvbnMucmVkdWNlKGZ1bmN0aW9uIChhbGwsIG9wdCkgeyByZXR1cm4gKF9fYXNzaWduKF9fYXNzaWduKHt9LCBhbGwpLCBwYXJzZU5vdGF0aW9uT3B0aW9ucyhvcHQpKSk7IH0sIHt9KSk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBjYXNlICdub3RhdGlvbi1zaW1wbGUnOlxuICAgICAgICAgICAgICAgIHJlc3VsdC5ub3RhdGlvbiA9ICdzdGFuZGFyZCc7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vdW5pY29kZS1vcmcvaWN1L2Jsb2IvbWFzdGVyL2ljdTRjL3NvdXJjZS9pMThuL3VuaWNvZGUvdW51bWJlcmZvcm1hdHRlci5oXG4gICAgICAgICAgICBjYXNlICd1bml0LXdpZHRoLW5hcnJvdyc6XG4gICAgICAgICAgICAgICAgcmVzdWx0LmN1cnJlbmN5RGlzcGxheSA9ICduYXJyb3dTeW1ib2wnO1xuICAgICAgICAgICAgICAgIHJlc3VsdC51bml0RGlzcGxheSA9ICduYXJyb3cnO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgY2FzZSAndW5pdC13aWR0aC1zaG9ydCc6XG4gICAgICAgICAgICAgICAgcmVzdWx0LmN1cnJlbmN5RGlzcGxheSA9ICdjb2RlJztcbiAgICAgICAgICAgICAgICByZXN1bHQudW5pdERpc3BsYXkgPSAnc2hvcnQnO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgY2FzZSAndW5pdC13aWR0aC1mdWxsLW5hbWUnOlxuICAgICAgICAgICAgICAgIHJlc3VsdC5jdXJyZW5jeURpc3BsYXkgPSAnbmFtZSc7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnVuaXREaXNwbGF5ID0gJ2xvbmcnO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgY2FzZSAndW5pdC13aWR0aC1pc28tY29kZSc6XG4gICAgICAgICAgICAgICAgcmVzdWx0LmN1cnJlbmN5RGlzcGxheSA9ICdzeW1ib2wnO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIFByZWNpc2lvblxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vdW5pY29kZS1vcmcvaWN1L2Jsb2IvbWFzdGVyL2RvY3MvdXNlcmd1aWRlL2Zvcm1hdF9wYXJzZS9udW1iZXJzL3NrZWxldG9ucy5tZCNmcmFjdGlvbi1wcmVjaXNpb25cbiAgICAgICAgaWYgKEZSQUNUSU9OX1BSRUNJU0lPTl9SRUdFWC50ZXN0KHRva2VuLnN0ZW0pKSB7XG4gICAgICAgICAgICBpZiAodG9rZW4ub3B0aW9ucy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ZyYWN0aW9uLXByZWNpc2lvbiBzdGVtcyBvbmx5IGFjY2VwdCBhIHNpbmdsZSBvcHRpb25hbCBvcHRpb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRva2VuLnN0ZW0ucmVwbGFjZShGUkFDVElPTl9QUkVDSVNJT05fUkVHRVgsIGZ1bmN0aW9uIChtYXRjaCwgZzEsIGcyKSB7XG4gICAgICAgICAgICAgICAgLy8gcHJlY2lzaW9uLWludGVnZXIgY2FzZVxuICAgICAgICAgICAgICAgIGlmIChtYXRjaCA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5tYXhpbXVtRnJhY3Rpb25EaWdpdHMgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyAuMDAwKyBjYXNlXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoZzIgPT09ICcrJykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQubWluaW11bUZyYWN0aW9uRGlnaXRzID0gZzIubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyAuIyMjIGNhc2VcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChnMVswXSA9PT0gJyMnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5tYXhpbXVtRnJhY3Rpb25EaWdpdHMgPSBnMS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIC4wMCMjIG9yIC4wMDAgY2FzZVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQubWluaW11bUZyYWN0aW9uRGlnaXRzID0gZzEubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQubWF4aW11bUZyYWN0aW9uRGlnaXRzID1cbiAgICAgICAgICAgICAgICAgICAgICAgIGcxLmxlbmd0aCArICh0eXBlb2YgZzIgPT09ICdzdHJpbmcnID8gZzIubGVuZ3RoIDogMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHRva2VuLm9wdGlvbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gX19hc3NpZ24oX19hc3NpZ24oe30sIHJlc3VsdCksIHBhcnNlU2lnbmlmaWNhbnRQcmVjaXNpb24odG9rZW4ub3B0aW9uc1swXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFNJR05JRklDQU5UX1BSRUNJU0lPTl9SRUdFWC50ZXN0KHRva2VuLnN0ZW0pKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBfX2Fzc2lnbihfX2Fzc2lnbih7fSwgcmVzdWx0KSwgcGFyc2VTaWduaWZpY2FudFByZWNpc2lvbih0b2tlbi5zdGVtKSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2lnbk9wdHMgPSBwYXJzZVNpZ24odG9rZW4uc3RlbSk7XG4gICAgICAgIGlmIChzaWduT3B0cykge1xuICAgICAgICAgICAgcmVzdWx0ID0gX19hc3NpZ24oX19hc3NpZ24oe30sIHJlc3VsdCksIHNpZ25PcHRzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuIiwiaW1wb3J0IHsgcGVnUGFyc2UgfSBmcm9tICcuL3BhcnNlcic7XG5pbXBvcnQgeyBub3JtYWxpemVIYXNodGFnSW5QbHVyYWwgfSBmcm9tICcuL25vcm1hbGl6ZSc7XG5leHBvcnQgKiBmcm9tICcuL3R5cGVzJztcbmV4cG9ydCAqIGZyb20gJy4vcGFyc2VyJztcbmV4cG9ydCAqIGZyb20gJy4vc2tlbGV0b24nO1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKGlucHV0LCBvcHRzKSB7XG4gICAgdmFyIGVscyA9IHBlZ1BhcnNlKGlucHV0LCBvcHRzKTtcbiAgICBpZiAoIW9wdHMgfHwgb3B0cy5ub3JtYWxpemVIYXNodGFnSW5QbHVyYWwgIT09IGZhbHNlKSB7XG4gICAgICAgIG5vcm1hbGl6ZUhhc2h0YWdJblBsdXJhbChlbHMpO1xuICAgIH1cbiAgICByZXR1cm4gZWxzO1xufVxuIiwiLypcbkNvcHlyaWdodCAoYykgMjAxNCwgWWFob28hIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbkNvcHlyaWdodHMgbGljZW5zZWQgdW5kZXIgdGhlIE5ldyBCU0QgTGljZW5zZS5cblNlZSB0aGUgYWNjb21wYW55aW5nIExJQ0VOU0UgZmlsZSBmb3IgdGVybXMuXG4qL1xudmFyIF9fc3ByZWFkQXJyYXlzID0gKHRoaXMgJiYgdGhpcy5fX3NwcmVhZEFycmF5cykgfHwgZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcbiAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcbiAgICByZXR1cm4gcjtcbn07XG4vLyAtLSBVdGlsaXRpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gZ2V0Q2FjaGVJZChpbnB1dHMpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoaW5wdXRzLm1hcChmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIGlucHV0ICYmIHR5cGVvZiBpbnB1dCA9PT0gJ29iamVjdCcgPyBvcmRlcmVkUHJvcHMoaW5wdXQpIDogaW5wdXQ7XG4gICAgfSkpO1xufVxuZnVuY3Rpb24gb3JkZXJlZFByb3BzKG9iaikge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmopXG4gICAgICAgIC5zb3J0KClcbiAgICAgICAgLm1hcChmdW5jdGlvbiAoaykge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIHJldHVybiAoX2EgPSB7fSwgX2Fba10gPSBvYmpba10sIF9hKTtcbiAgICB9KTtcbn1cbnZhciBtZW1vaXplRm9ybWF0Q29uc3RydWN0b3IgPSBmdW5jdGlvbiAoRm9ybWF0Q29uc3RydWN0b3IsIGNhY2hlKSB7XG4gICAgaWYgKGNhY2hlID09PSB2b2lkIDApIHsgY2FjaGUgPSB7fTsgfVxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIGFyZ3NbX2ldID0gYXJndW1lbnRzW19pXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2FjaGVJZCA9IGdldENhY2hlSWQoYXJncyk7XG4gICAgICAgIHZhciBmb3JtYXQgPSBjYWNoZUlkICYmIGNhY2hlW2NhY2hlSWRdO1xuICAgICAgICBpZiAoIWZvcm1hdCkge1xuICAgICAgICAgICAgZm9ybWF0ID0gbmV3ICgoX2EgPSBGb3JtYXRDb25zdHJ1Y3RvcikuYmluZC5hcHBseShfYSwgX19zcHJlYWRBcnJheXMoW3ZvaWQgMF0sIGFyZ3MpKSkoKTtcbiAgICAgICAgICAgIGlmIChjYWNoZUlkKSB7XG4gICAgICAgICAgICAgICAgY2FjaGVbY2FjaGVJZF0gPSBmb3JtYXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvcm1hdDtcbiAgICB9O1xufTtcbmV4cG9ydCBkZWZhdWx0IG1lbW9pemVGb3JtYXRDb25zdHJ1Y3Rvcjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsInZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZXh0ZW5kU3RhdGljcyA9IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgICAgIGV4dGVuZFN0YXRpY3MgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHxcbiAgICAgICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdOyB9O1xuICAgICAgICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcbiAgICB9O1xuICAgIHJldHVybiBmdW5jdGlvbiAoZCwgYikge1xuICAgICAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xuICAgICAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICAgICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xuICAgIH07XG59KSgpO1xudmFyIF9fc3ByZWFkQXJyYXlzID0gKHRoaXMgJiYgdGhpcy5fX3NwcmVhZEFycmF5cykgfHwgZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcbiAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcbiAgICByZXR1cm4gcjtcbn07XG5pbXBvcnQgeyBjb252ZXJ0TnVtYmVyU2tlbGV0b25Ub051bWJlckZvcm1hdE9wdGlvbnMsIGlzQXJndW1lbnRFbGVtZW50LCBpc0RhdGVFbGVtZW50LCBpc0RhdGVUaW1lU2tlbGV0b24sIGlzTGl0ZXJhbEVsZW1lbnQsIGlzTnVtYmVyRWxlbWVudCwgaXNOdW1iZXJTa2VsZXRvbiwgaXNQbHVyYWxFbGVtZW50LCBpc1BvdW5kRWxlbWVudCwgaXNTZWxlY3RFbGVtZW50LCBpc1RpbWVFbGVtZW50LCBwYXJzZURhdGVUaW1lU2tlbGV0b24sIH0gZnJvbSAnaW50bC1tZXNzYWdlZm9ybWF0LXBhcnNlcic7XG52YXIgRm9ybWF0RXJyb3IgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEZvcm1hdEVycm9yLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEZvcm1hdEVycm9yKG1zZywgdmFyaWFibGVJZCkge1xuICAgICAgICB2YXIgX3RoaXMgPSBfc3VwZXIuY2FsbCh0aGlzLCBtc2cpIHx8IHRoaXM7XG4gICAgICAgIF90aGlzLnZhcmlhYmxlSWQgPSB2YXJpYWJsZUlkO1xuICAgICAgICByZXR1cm4gX3RoaXM7XG4gICAgfVxuICAgIHJldHVybiBGb3JtYXRFcnJvcjtcbn0oRXJyb3IpKTtcbmZ1bmN0aW9uIG1lcmdlTGl0ZXJhbChwYXJ0cykge1xuICAgIGlmIChwYXJ0cy5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiBwYXJ0cztcbiAgICB9XG4gICAgcmV0dXJuIHBhcnRzLnJlZHVjZShmdW5jdGlvbiAoYWxsLCBwYXJ0KSB7XG4gICAgICAgIHZhciBsYXN0UGFydCA9IGFsbFthbGwubGVuZ3RoIC0gMV07XG4gICAgICAgIGlmICghbGFzdFBhcnQgfHxcbiAgICAgICAgICAgIGxhc3RQYXJ0LnR5cGUgIT09IDAgLyogbGl0ZXJhbCAqLyB8fFxuICAgICAgICAgICAgcGFydC50eXBlICE9PSAwIC8qIGxpdGVyYWwgKi8pIHtcbiAgICAgICAgICAgIGFsbC5wdXNoKHBhcnQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGFzdFBhcnQudmFsdWUgKz0gcGFydC52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWxsO1xuICAgIH0sIFtdKTtcbn1cbi8vIFRPRE8oc2tlbGV0b24pOiBhZGQgc2tlbGV0b24gc3VwcG9ydFxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFRvUGFydHMoZWxzLCBsb2NhbGVzLCBmb3JtYXR0ZXJzLCBmb3JtYXRzLCB2YWx1ZXMsIGN1cnJlbnRQbHVyYWxWYWx1ZSwgXG4vLyBGb3IgZGVidWdnaW5nXG5vcmlnaW5hbE1lc3NhZ2UpIHtcbiAgICAvLyBIb3QgcGF0aCBmb3Igc3RyYWlnaHQgc2ltcGxlIG1zZyB0cmFuc2xhdGlvbnNcbiAgICBpZiAoZWxzLmxlbmd0aCA9PT0gMSAmJiBpc0xpdGVyYWxFbGVtZW50KGVsc1swXSkpIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAwIC8qIGxpdGVyYWwgKi8sXG4gICAgICAgICAgICAgICAgdmFsdWU6IGVsc1swXS52YWx1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIF07XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDAsIGVsc18xID0gZWxzOyBfaSA8IGVsc18xLmxlbmd0aDsgX2krKykge1xuICAgICAgICB2YXIgZWwgPSBlbHNfMVtfaV07XG4gICAgICAgIC8vIEV4aXQgZWFybHkgZm9yIHN0cmluZyBwYXJ0cy5cbiAgICAgICAgaWYgKGlzTGl0ZXJhbEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogMCAvKiBsaXRlcmFsICovLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlbC52YWx1ZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETzogc2hvdWxkIHRoaXMgcGFydCBiZSBsaXRlcmFsIHR5cGU/XG4gICAgICAgIC8vIFJlcGxhY2UgYCNgIGluIHBsdXJhbCBydWxlcyB3aXRoIHRoZSBhY3R1YWwgbnVtZXJpYyB2YWx1ZS5cbiAgICAgICAgaWYgKGlzUG91bmRFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjdXJyZW50UGx1cmFsVmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAwIC8qIGxpdGVyYWwgKi8sXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBmb3JtYXR0ZXJzLmdldE51bWJlckZvcm1hdChsb2NhbGVzKS5mb3JtYXQoY3VycmVudFBsdXJhbFZhbHVlKSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YXJOYW1lID0gZWwudmFsdWU7XG4gICAgICAgIC8vIEVuZm9yY2UgdGhhdCBhbGwgcmVxdWlyZWQgdmFsdWVzIGFyZSBwcm92aWRlZCBieSB0aGUgY2FsbGVyLlxuICAgICAgICBpZiAoISh2YWx1ZXMgJiYgdmFyTmFtZSBpbiB2YWx1ZXMpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRm9ybWF0RXJyb3IoXCJUaGUgaW50bCBzdHJpbmcgY29udGV4dCB2YXJpYWJsZSBcXFwiXCIgKyB2YXJOYW1lICsgXCJcXFwiIHdhcyBub3QgcHJvdmlkZWQgdG8gdGhlIHN0cmluZyBcXFwiXCIgKyBvcmlnaW5hbE1lc3NhZ2UgKyBcIlxcXCJcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZhbHVlID0gdmFsdWVzW3Zhck5hbWVdO1xuICAgICAgICBpZiAoaXNBcmd1bWVudEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIHZhbHVlID1cbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFN0cmluZyh2YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogMSAvKiBhcmd1bWVudCAqLyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlY3Vyc2l2ZWx5IGZvcm1hdCBwbHVyYWwgYW5kIHNlbGVjdCBwYXJ0cycgb3B0aW9uIOKAlCB3aGljaCBjYW4gYmUgYVxuICAgICAgICAvLyBuZXN0ZWQgcGF0dGVybiBzdHJ1Y3R1cmUuIFRoZSBjaG9vc2luZyBvZiB0aGUgb3B0aW9uIHRvIHVzZSBpc1xuICAgICAgICAvLyBhYnN0cmFjdGVkLWJ5IGFuZCBkZWxlZ2F0ZWQtdG8gdGhlIHBhcnQgaGVscGVyIG9iamVjdC5cbiAgICAgICAgaWYgKGlzRGF0ZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICB2YXIgc3R5bGUgPSB0eXBlb2YgZWwuc3R5bGUgPT09ICdzdHJpbmcnID8gZm9ybWF0cy5kYXRlW2VsLnN0eWxlXSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiAwIC8qIGxpdGVyYWwgKi8sXG4gICAgICAgICAgICAgICAgdmFsdWU6IGZvcm1hdHRlcnNcbiAgICAgICAgICAgICAgICAgICAgLmdldERhdGVUaW1lRm9ybWF0KGxvY2FsZXMsIHN0eWxlKVxuICAgICAgICAgICAgICAgICAgICAuZm9ybWF0KHZhbHVlKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzVGltZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICB2YXIgc3R5bGUgPSB0eXBlb2YgZWwuc3R5bGUgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICAgICAgPyBmb3JtYXRzLnRpbWVbZWwuc3R5bGVdXG4gICAgICAgICAgICAgICAgOiBpc0RhdGVUaW1lU2tlbGV0b24oZWwuc3R5bGUpXG4gICAgICAgICAgICAgICAgICAgID8gcGFyc2VEYXRlVGltZVNrZWxldG9uKGVsLnN0eWxlLnBhdHRlcm4pXG4gICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6IDAgLyogbGl0ZXJhbCAqLyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZm9ybWF0dGVyc1xuICAgICAgICAgICAgICAgICAgICAuZ2V0RGF0ZVRpbWVGb3JtYXQobG9jYWxlcywgc3R5bGUpXG4gICAgICAgICAgICAgICAgICAgIC5mb3JtYXQodmFsdWUpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNOdW1iZXJFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgdmFyIHN0eWxlID0gdHlwZW9mIGVsLnN0eWxlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgID8gZm9ybWF0cy5udW1iZXJbZWwuc3R5bGVdXG4gICAgICAgICAgICAgICAgOiBpc051bWJlclNrZWxldG9uKGVsLnN0eWxlKVxuICAgICAgICAgICAgICAgICAgICA/IGNvbnZlcnROdW1iZXJTa2VsZXRvblRvTnVtYmVyRm9ybWF0T3B0aW9ucyhlbC5zdHlsZS50b2tlbnMpXG4gICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6IDAgLyogbGl0ZXJhbCAqLyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZm9ybWF0dGVyc1xuICAgICAgICAgICAgICAgICAgICAuZ2V0TnVtYmVyRm9ybWF0KGxvY2FsZXMsIHN0eWxlKVxuICAgICAgICAgICAgICAgICAgICAuZm9ybWF0KHZhbHVlKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzU2VsZWN0RWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgIHZhciBvcHQgPSBlbC5vcHRpb25zW3ZhbHVlXSB8fCBlbC5vcHRpb25zLm90aGVyO1xuICAgICAgICAgICAgaWYgKCFvcHQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcIkludmFsaWQgdmFsdWVzIGZvciBcXFwiXCIgKyBlbC52YWx1ZSArIFwiXFxcIjogXFxcIlwiICsgdmFsdWUgKyBcIlxcXCIuIE9wdGlvbnMgYXJlIFxcXCJcIiArIE9iamVjdC5rZXlzKGVsLm9wdGlvbnMpLmpvaW4oJ1wiLCBcIicpICsgXCJcXFwiXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0LnB1c2guYXBwbHkocmVzdWx0LCBmb3JtYXRUb1BhcnRzKG9wdC52YWx1ZSwgbG9jYWxlcywgZm9ybWF0dGVycywgZm9ybWF0cywgdmFsdWVzKSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNQbHVyYWxFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgdmFyIG9wdCA9IGVsLm9wdGlvbnNbXCI9XCIgKyB2YWx1ZV07XG4gICAgICAgICAgICBpZiAoIW9wdCkge1xuICAgICAgICAgICAgICAgIGlmICghSW50bC5QbHVyYWxSdWxlcykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRm9ybWF0RXJyb3IoXCJJbnRsLlBsdXJhbFJ1bGVzIGlzIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudC5cXG5UcnkgcG9seWZpbGxpbmcgaXQgdXNpbmcgXFxcIkBmb3JtYXRqcy9pbnRsLXBsdXJhbHJ1bGVzXFxcIlxcblwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJ1bGUgPSBmb3JtYXR0ZXJzXG4gICAgICAgICAgICAgICAgICAgIC5nZXRQbHVyYWxSdWxlcyhsb2NhbGVzLCB7IHR5cGU6IGVsLnBsdXJhbFR5cGUgfSlcbiAgICAgICAgICAgICAgICAgICAgLnNlbGVjdCh2YWx1ZSAtIChlbC5vZmZzZXQgfHwgMCkpO1xuICAgICAgICAgICAgICAgIG9wdCA9IGVsLm9wdGlvbnNbcnVsZV0gfHwgZWwub3B0aW9ucy5vdGhlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghb3B0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCJJbnZhbGlkIHZhbHVlcyBmb3IgXFxcIlwiICsgZWwudmFsdWUgKyBcIlxcXCI6IFxcXCJcIiArIHZhbHVlICsgXCJcXFwiLiBPcHRpb25zIGFyZSBcXFwiXCIgKyBPYmplY3Qua2V5cyhlbC5vcHRpb25zKS5qb2luKCdcIiwgXCInKSArIFwiXFxcIlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoLmFwcGx5KHJlc3VsdCwgZm9ybWF0VG9QYXJ0cyhvcHQudmFsdWUsIGxvY2FsZXMsIGZvcm1hdHRlcnMsIGZvcm1hdHMsIHZhbHVlcywgdmFsdWUgLSAoZWwub2Zmc2V0IHx8IDApKSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWVyZ2VMaXRlcmFsKHJlc3VsdCk7XG59XG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0VG9TdHJpbmcoZWxzLCBsb2NhbGVzLCBmb3JtYXR0ZXJzLCBmb3JtYXRzLCB2YWx1ZXMsIFxuLy8gRm9yIGRlYnVnZ2luZ1xub3JpZ2luYWxNZXNzYWdlKSB7XG4gICAgdmFyIHBhcnRzID0gZm9ybWF0VG9QYXJ0cyhlbHMsIGxvY2FsZXMsIGZvcm1hdHRlcnMsIGZvcm1hdHMsIHZhbHVlcywgdW5kZWZpbmVkLCBvcmlnaW5hbE1lc3NhZ2UpO1xuICAgIC8vIEhvdCBwYXRoIGZvciBzdHJhaWdodCBzaW1wbGUgbXNnIHRyYW5zbGF0aW9uc1xuICAgIGlmIChwYXJ0cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIHBhcnRzWzBdLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gcGFydHMucmVkdWNlKGZ1bmN0aW9uIChhbGwsIHBhcnQpIHsgcmV0dXJuIChhbGwgKz0gcGFydC52YWx1ZSk7IH0sICcnKTtcbn1cbi8vIFNpbmdsZXRvblxudmFyIGRvbVBhcnNlcjtcbnZhciBUT0tFTl9ERUxJTUlURVIgPSAnQEAnO1xudmFyIFRPS0VOX1JFR0VYID0gL0BAKFxcZCtfXFxkKylAQC9nO1xudmFyIGNvdW50ZXIgPSAwO1xuZnVuY3Rpb24gZ2VuZXJhdGVJZCgpIHtcbiAgICByZXR1cm4gRGF0ZS5ub3coKSArIFwiX1wiICsgKytjb3VudGVyO1xufVxuZnVuY3Rpb24gcmVzdG9yZVJpY2hQbGFjZWhvbGRlck1lc3NhZ2UodGV4dCwgb2JqZWN0UGFydHMpIHtcbiAgICByZXR1cm4gdGV4dFxuICAgICAgICAuc3BsaXQoVE9LRU5fUkVHRVgpXG4gICAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgICAgLm1hcChmdW5jdGlvbiAoYykgeyByZXR1cm4gKG9iamVjdFBhcnRzW2NdICE9IG51bGwgPyBvYmplY3RQYXJ0c1tjXSA6IGMpOyB9KVxuICAgICAgICAucmVkdWNlKGZ1bmN0aW9uIChhbGwsIGMpIHtcbiAgICAgICAgaWYgKCFhbGwubGVuZ3RoKSB7XG4gICAgICAgICAgICBhbGwucHVzaChjKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgYyA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgICAgIHR5cGVvZiBhbGxbYWxsLmxlbmd0aCAtIDFdID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgYWxsW2FsbC5sZW5ndGggLSAxXSArPSBjO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYWxsLnB1c2goYyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFsbDtcbiAgICB9LCBbXSk7XG59XG4vKipcbiAqIE5vdCBleGhhdXN0aXZlLCBqdXN0IGZvciBzYW5pdHkgY2hlY2tcbiAqL1xudmFyIFNJTVBMRV9YTUxfUkVHRVggPSAvKDwoWzAtOWEtekEtWi1fXSo/KT4oLio/KTxcXC8oWzAtOWEtekEtWi1fXSo/KT4pfCg8WzAtOWEtekEtWi1fXSo/XFwvPikvO1xudmFyIFRFTVBMQVRFX0lEID0gRGF0ZS5ub3coKSArICdAQCc7XG52YXIgVk9JRF9FTEVNRU5UUyA9IFtcbiAgICAnYXJlYScsXG4gICAgJ2Jhc2UnLFxuICAgICdicicsXG4gICAgJ2NvbCcsXG4gICAgJ2VtYmVkJyxcbiAgICAnaHInLFxuICAgICdpbWcnLFxuICAgICdpbnB1dCcsXG4gICAgJ2xpbmsnLFxuICAgICdtZXRhJyxcbiAgICAncGFyYW0nLFxuICAgICdzb3VyY2UnLFxuICAgICd0cmFjaycsXG4gICAgJ3dicicsXG5dO1xuZnVuY3Rpb24gZm9ybWF0SFRNTEVsZW1lbnQoZWwsIG9iamVjdFBhcnRzLCB2YWx1ZXMpIHtcbiAgICB2YXIgdGFnTmFtZSA9IGVsLnRhZ05hbWU7XG4gICAgdmFyIG91dGVySFRNTCA9IGVsLm91dGVySFRNTCwgdGV4dENvbnRlbnQgPSBlbC50ZXh0Q29udGVudCwgY2hpbGROb2RlcyA9IGVsLmNoaWxkTm9kZXM7XG4gICAgLy8gUmVndWxhciB0ZXh0XG4gICAgaWYgKCF0YWdOYW1lKSB7XG4gICAgICAgIHJldHVybiByZXN0b3JlUmljaFBsYWNlaG9sZGVyTWVzc2FnZSh0ZXh0Q29udGVudCB8fCAnJywgb2JqZWN0UGFydHMpO1xuICAgIH1cbiAgICB0YWdOYW1lID0gdGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBpc1ZvaWRFbGVtZW50ID0gflZPSURfRUxFTUVOVFMuaW5kZXhPZih0YWdOYW1lKTtcbiAgICB2YXIgZm9ybWF0Rm5PclZhbHVlID0gdmFsdWVzW3RhZ05hbWVdO1xuICAgIGlmIChmb3JtYXRGbk9yVmFsdWUgJiYgaXNWb2lkRWxlbWVudCkge1xuICAgICAgICB0aHJvdyBuZXcgRm9ybWF0RXJyb3IodGFnTmFtZSArIFwiIGlzIGEgc2VsZi1jbG9zaW5nIHRhZyBhbmQgY2FuIG5vdCBiZSB1c2VkLCBwbGVhc2UgdXNlIGFub3RoZXIgdGFnIG5hbWUuXCIpO1xuICAgIH1cbiAgICBpZiAoIWNoaWxkTm9kZXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBbb3V0ZXJIVE1MXTtcbiAgICB9XG4gICAgdmFyIGNodW5rcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGNoaWxkTm9kZXMpLnJlZHVjZShmdW5jdGlvbiAoYWxsLCBjaGlsZCkge1xuICAgICAgICByZXR1cm4gYWxsLmNvbmNhdChmb3JtYXRIVE1MRWxlbWVudChjaGlsZCwgb2JqZWN0UGFydHMsIHZhbHVlcykpO1xuICAgIH0sIFtdKTtcbiAgICAvLyBMZWdhY3kgSFRNTFxuICAgIGlmICghZm9ybWF0Rm5PclZhbHVlKSB7XG4gICAgICAgIHJldHVybiBfX3NwcmVhZEFycmF5cyhbXCI8XCIgKyB0YWdOYW1lICsgXCI+XCJdLCBjaHVua3MsIFtcIjwvXCIgKyB0YWdOYW1lICsgXCI+XCJdKTtcbiAgICB9XG4gICAgLy8gSFRNTCBUYWcgcmVwbGFjZW1lbnRcbiAgICBpZiAodHlwZW9mIGZvcm1hdEZuT3JWYWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gW2Zvcm1hdEZuT3JWYWx1ZS5hcHBseSh2b2lkIDAsIGNodW5rcyldO1xuICAgIH1cbiAgICByZXR1cm4gW2Zvcm1hdEZuT3JWYWx1ZV07XG59XG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0SFRNTE1lc3NhZ2UoZWxzLCBsb2NhbGVzLCBmb3JtYXR0ZXJzLCBmb3JtYXRzLCB2YWx1ZXMsIFxuLy8gRm9yIGRlYnVnZ2luZ1xub3JpZ2luYWxNZXNzYWdlKSB7XG4gICAgdmFyIHBhcnRzID0gZm9ybWF0VG9QYXJ0cyhlbHMsIGxvY2FsZXMsIGZvcm1hdHRlcnMsIGZvcm1hdHMsIHZhbHVlcywgdW5kZWZpbmVkLCBvcmlnaW5hbE1lc3NhZ2UpO1xuICAgIHZhciBvYmplY3RQYXJ0cyA9IHt9O1xuICAgIHZhciBmb3JtYXR0ZWRNZXNzYWdlID0gcGFydHMucmVkdWNlKGZ1bmN0aW9uIChhbGwsIHBhcnQpIHtcbiAgICAgICAgaWYgKHBhcnQudHlwZSA9PT0gMCAvKiBsaXRlcmFsICovKSB7XG4gICAgICAgICAgICByZXR1cm4gKGFsbCArPSBwYXJ0LnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWQgPSBnZW5lcmF0ZUlkKCk7XG4gICAgICAgIG9iamVjdFBhcnRzW2lkXSA9IHBhcnQudmFsdWU7XG4gICAgICAgIHJldHVybiAoYWxsICs9IFwiXCIgKyBUT0tFTl9ERUxJTUlURVIgKyBpZCArIFRPS0VOX0RFTElNSVRFUik7XG4gICAgfSwgJycpO1xuICAgIC8vIE5vdCBkZXNpZ25lZCB0byBmaWx0ZXIgb3V0IGFnZ3Jlc3NpdmVseVxuICAgIGlmICghU0lNUExFX1hNTF9SRUdFWC50ZXN0KGZvcm1hdHRlZE1lc3NhZ2UpKSB7XG4gICAgICAgIHJldHVybiByZXN0b3JlUmljaFBsYWNlaG9sZGVyTWVzc2FnZShmb3JtYXR0ZWRNZXNzYWdlLCBvYmplY3RQYXJ0cyk7XG4gICAgfVxuICAgIGlmICghdmFsdWVzKSB7XG4gICAgICAgIHRocm93IG5ldyBGb3JtYXRFcnJvcignTWVzc2FnZSBoYXMgcGxhY2Vob2xkZXJzIGJ1dCBubyB2YWx1ZXMgd2FzIGdpdmVuJyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgRE9NUGFyc2VyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aHJvdyBuZXcgRm9ybWF0RXJyb3IoJ0Nhbm5vdCBmb3JtYXQgWE1MIG1lc3NhZ2Ugd2l0aG91dCBET01QYXJzZXInKTtcbiAgICB9XG4gICAgaWYgKCFkb21QYXJzZXIpIHtcbiAgICAgICAgZG9tUGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xuICAgIH1cbiAgICB2YXIgY29udGVudCA9IGRvbVBhcnNlclxuICAgICAgICAucGFyc2VGcm9tU3RyaW5nKFwiPGZvcm1hdHRlZC1tZXNzYWdlIGlkPVxcXCJcIiArIFRFTVBMQVRFX0lEICsgXCJcXFwiPlwiICsgZm9ybWF0dGVkTWVzc2FnZSArIFwiPC9mb3JtYXR0ZWQtbWVzc2FnZT5cIiwgJ3RleHQvaHRtbCcpXG4gICAgICAgIC5nZXRFbGVtZW50QnlJZChURU1QTEFURV9JRCk7XG4gICAgaWYgKCFjb250ZW50KSB7XG4gICAgICAgIHRocm93IG5ldyBGb3JtYXRFcnJvcihcIk1hbGZvcm1lZCBIVE1MIG1lc3NhZ2UgXCIgKyBmb3JtYXR0ZWRNZXNzYWdlKTtcbiAgICB9XG4gICAgdmFyIHRhZ3NUb0Zvcm1hdCA9IE9iamVjdC5rZXlzKHZhbHVlcykuZmlsdGVyKGZ1bmN0aW9uICh2YXJOYW1lKSB7IHJldHVybiAhIWNvbnRlbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUodmFyTmFtZSkubGVuZ3RoOyB9KTtcbiAgICAvLyBObyB0YWdzIHRvIGZvcm1hdFxuICAgIGlmICghdGFnc1RvRm9ybWF0Lmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gcmVzdG9yZVJpY2hQbGFjZWhvbGRlck1lc3NhZ2UoZm9ybWF0dGVkTWVzc2FnZSwgb2JqZWN0UGFydHMpO1xuICAgIH1cbiAgICB2YXIgY2FzZVNlbnNpdGl2ZVRhZ3MgPSB0YWdzVG9Gb3JtYXQuZmlsdGVyKGZ1bmN0aW9uICh0YWdOYW1lKSB7IHJldHVybiB0YWdOYW1lICE9PSB0YWdOYW1lLnRvTG93ZXJDYXNlKCk7IH0pO1xuICAgIGlmIChjYXNlU2Vuc2l0aXZlVGFncy5sZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZvcm1hdEVycm9yKFwiSFRNTCB0YWcgbXVzdCBiZSBsb3dlcmNhc2VkIGJ1dCB0aGUgZm9sbG93aW5nIHRhZ3MgYXJlIG5vdDogXCIgKyBjYXNlU2Vuc2l0aXZlVGFncy5qb2luKCcsICcpKTtcbiAgICB9XG4gICAgLy8gV2UncmUgZG9pbmcgdGhpcyBzaW5jZSB0b3Agbm9kZSBpcyBgPGZvcm1hdHRlZC1tZXNzYWdlLz5gIHdoaWNoIGRvZXMgbm90IGhhdmUgYSBmb3JtYXR0ZXJcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlXG4gICAgICAgIC5jYWxsKGNvbnRlbnQuY2hpbGROb2RlcylcbiAgICAgICAgLnJlZHVjZShmdW5jdGlvbiAoYWxsLCBjaGlsZCkgeyByZXR1cm4gYWxsLmNvbmNhdChmb3JtYXRIVE1MRWxlbWVudChjaGlsZCwgb2JqZWN0UGFydHMsIHZhbHVlcykpOyB9LCBbXSk7XG59XG4iLCIvKlxuQ29weXJpZ2h0IChjKSAyMDE0LCBZYWhvbyEgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuQ29weXJpZ2h0cyBsaWNlbnNlZCB1bmRlciB0aGUgTmV3IEJTRCBMaWNlbnNlLlxuU2VlIHRoZSBhY2NvbXBhbnlpbmcgTElDRU5TRSBmaWxlIGZvciB0ZXJtcy5cbiovXG52YXIgX19hc3NpZ24gPSAodGhpcyAmJiB0aGlzLl9fYXNzaWduKSB8fCBmdW5jdGlvbiAoKSB7XG4gICAgX19hc3NpZ24gPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKVxuICAgICAgICAgICAgICAgIHRbcF0gPSBzW3BdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0O1xuICAgIH07XG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuaW1wb3J0IHsgcGFyc2UgfSBmcm9tICdpbnRsLW1lc3NhZ2Vmb3JtYXQtcGFyc2VyJztcbmltcG9ydCBtZW1vaXplSW50bENvbnN0cnVjdG9yIGZyb20gJ2ludGwtZm9ybWF0LWNhY2hlJztcbmltcG9ydCB7IGZvcm1hdFRvU3RyaW5nLCBmb3JtYXRUb1BhcnRzLCBmb3JtYXRIVE1MTWVzc2FnZSwgfSBmcm9tICcuL2Zvcm1hdHRlcnMnO1xuLy8gLS0gTWVzc2FnZUZvcm1hdCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gbWVyZ2VDb25maWcoYzEsIGMyKSB7XG4gICAgaWYgKCFjMikge1xuICAgICAgICByZXR1cm4gYzE7XG4gICAgfVxuICAgIHJldHVybiBfX2Fzc2lnbihfX2Fzc2lnbihfX2Fzc2lnbih7fSwgKGMxIHx8IHt9KSksIChjMiB8fCB7fSkpLCBPYmplY3Qua2V5cyhjMSkucmVkdWNlKGZ1bmN0aW9uIChhbGwsIGspIHtcbiAgICAgICAgYWxsW2tdID0gX19hc3NpZ24oX19hc3NpZ24oe30sIGMxW2tdKSwgKGMyW2tdIHx8IHt9KSk7XG4gICAgICAgIHJldHVybiBhbGw7XG4gICAgfSwge30pKTtcbn1cbmZ1bmN0aW9uIG1lcmdlQ29uZmlncyhkZWZhdWx0Q29uZmlnLCBjb25maWdzKSB7XG4gICAgaWYgKCFjb25maWdzKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0Q29uZmlnO1xuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LmtleXMoZGVmYXVsdENvbmZpZykucmVkdWNlKGZ1bmN0aW9uIChhbGwsIGspIHtcbiAgICAgICAgYWxsW2tdID0gbWVyZ2VDb25maWcoZGVmYXVsdENvbmZpZ1trXSwgY29uZmlnc1trXSk7XG4gICAgICAgIHJldHVybiBhbGw7XG4gICAgfSwgX19hc3NpZ24oe30sIGRlZmF1bHRDb25maWcpKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEZWZhdWx0Rm9ybWF0dGVycyhjYWNoZSkge1xuICAgIGlmIChjYWNoZSA9PT0gdm9pZCAwKSB7IGNhY2hlID0ge1xuICAgICAgICBudW1iZXI6IHt9LFxuICAgICAgICBkYXRlVGltZToge30sXG4gICAgICAgIHBsdXJhbFJ1bGVzOiB7fSxcbiAgICB9OyB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0TnVtYmVyRm9ybWF0OiBtZW1vaXplSW50bENvbnN0cnVjdG9yKEludGwuTnVtYmVyRm9ybWF0LCBjYWNoZS5udW1iZXIpLFxuICAgICAgICBnZXREYXRlVGltZUZvcm1hdDogbWVtb2l6ZUludGxDb25zdHJ1Y3RvcihJbnRsLkRhdGVUaW1lRm9ybWF0LCBjYWNoZS5kYXRlVGltZSksXG4gICAgICAgIGdldFBsdXJhbFJ1bGVzOiBtZW1vaXplSW50bENvbnN0cnVjdG9yKEludGwuUGx1cmFsUnVsZXMsIGNhY2hlLnBsdXJhbFJ1bGVzKSxcbiAgICB9O1xufVxudmFyIEludGxNZXNzYWdlRm9ybWF0ID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEludGxNZXNzYWdlRm9ybWF0KG1lc3NhZ2UsIGxvY2FsZXMsIG92ZXJyaWRlRm9ybWF0cywgb3B0cykge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBpZiAobG9jYWxlcyA9PT0gdm9pZCAwKSB7IGxvY2FsZXMgPSBJbnRsTWVzc2FnZUZvcm1hdC5kZWZhdWx0TG9jYWxlOyB9XG4gICAgICAgIHRoaXMuZm9ybWF0dGVyQ2FjaGUgPSB7XG4gICAgICAgICAgICBudW1iZXI6IHt9LFxuICAgICAgICAgICAgZGF0ZVRpbWU6IHt9LFxuICAgICAgICAgICAgcGx1cmFsUnVsZXM6IHt9LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmZvcm1hdCA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXRUb1N0cmluZyhfdGhpcy5hc3QsIF90aGlzLmxvY2FsZXMsIF90aGlzLmZvcm1hdHRlcnMsIF90aGlzLmZvcm1hdHMsIHZhbHVlcywgX3RoaXMubWVzc2FnZSk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZm9ybWF0VG9QYXJ0cyA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXRUb1BhcnRzKF90aGlzLmFzdCwgX3RoaXMubG9jYWxlcywgX3RoaXMuZm9ybWF0dGVycywgX3RoaXMuZm9ybWF0cywgdmFsdWVzLCB1bmRlZmluZWQsIF90aGlzLm1lc3NhZ2UpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmZvcm1hdEhUTUxNZXNzYWdlID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdEhUTUxNZXNzYWdlKF90aGlzLmFzdCwgX3RoaXMubG9jYWxlcywgX3RoaXMuZm9ybWF0dGVycywgX3RoaXMuZm9ybWF0cywgdmFsdWVzLCBfdGhpcy5tZXNzYWdlKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5yZXNvbHZlZE9wdGlvbnMgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAoe1xuICAgICAgICAgICAgbG9jYWxlOiBJbnRsLk51bWJlckZvcm1hdC5zdXBwb3J0ZWRMb2NhbGVzT2YoX3RoaXMubG9jYWxlcylbMF0sXG4gICAgICAgIH0pOyB9O1xuICAgICAgICB0aGlzLmdldEFzdCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIF90aGlzLmFzdDsgfTtcbiAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgICAgICAgIGlmICghSW50bE1lc3NhZ2VGb3JtYXQuX19wYXJzZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludGxNZXNzYWdlRm9ybWF0Ll9fcGFyc2UgbXVzdCBiZSBzZXQgdG8gcHJvY2VzcyBgbWVzc2FnZWAgb2YgdHlwZSBgc3RyaW5nYCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUGFyc2Ugc3RyaW5nIG1lc3NhZ2VzIGludG8gYW4gQVNULlxuICAgICAgICAgICAgdGhpcy5hc3QgPSBJbnRsTWVzc2FnZUZvcm1hdC5fX3BhcnNlKG1lc3NhZ2UsIHtcbiAgICAgICAgICAgICAgICBub3JtYWxpemVIYXNodGFnSW5QbHVyYWw6IGZhbHNlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmFzdCA9IG1lc3NhZ2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHRoaXMuYXN0KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBtZXNzYWdlIG11c3QgYmUgcHJvdmlkZWQgYXMgYSBTdHJpbmcgb3IgQVNULicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgb2JqZWN0IHdpdGggdGhlIHNwZWNpZmllZCBgZm9ybWF0c2AgbWVyZ2VkIHdpdGggdGhlIGRlZmF1bHRcbiAgICAgICAgLy8gZm9ybWF0cy5cbiAgICAgICAgdGhpcy5mb3JtYXRzID0gbWVyZ2VDb25maWdzKEludGxNZXNzYWdlRm9ybWF0LmZvcm1hdHMsIG92ZXJyaWRlRm9ybWF0cyk7XG4gICAgICAgIC8vIERlZmluZWQgZmlyc3QgYmVjYXVzZSBpdCdzIHVzZWQgdG8gYnVpbGQgdGhlIGZvcm1hdCBwYXR0ZXJuLlxuICAgICAgICB0aGlzLmxvY2FsZXMgPSBsb2NhbGVzO1xuICAgICAgICB0aGlzLmZvcm1hdHRlcnMgPVxuICAgICAgICAgICAgKG9wdHMgJiYgb3B0cy5mb3JtYXR0ZXJzKSB8fCBjcmVhdGVEZWZhdWx0Rm9ybWF0dGVycyh0aGlzLmZvcm1hdHRlckNhY2hlKTtcbiAgICB9XG4gICAgSW50bE1lc3NhZ2VGb3JtYXQuZGVmYXVsdExvY2FsZSA9IG5ldyBJbnRsLk51bWJlckZvcm1hdCgpLnJlc29sdmVkT3B0aW9ucygpLmxvY2FsZTtcbiAgICBJbnRsTWVzc2FnZUZvcm1hdC5fX3BhcnNlID0gcGFyc2U7XG4gICAgLy8gRGVmYXVsdCBmb3JtYXQgb3B0aW9ucyB1c2VkIGFzIHRoZSBwcm90b3R5cGUgb2YgdGhlIGBmb3JtYXRzYCBwcm92aWRlZCB0byB0aGVcbiAgICAvLyBjb25zdHJ1Y3Rvci4gVGhlc2UgYXJlIHVzZWQgd2hlbiBjb25zdHJ1Y3RpbmcgdGhlIGludGVybmFsIEludGwuTnVtYmVyRm9ybWF0XG4gICAgLy8gYW5kIEludGwuRGF0ZVRpbWVGb3JtYXQgaW5zdGFuY2VzLlxuICAgIEludGxNZXNzYWdlRm9ybWF0LmZvcm1hdHMgPSB7XG4gICAgICAgIG51bWJlcjoge1xuICAgICAgICAgICAgY3VycmVuY3k6IHtcbiAgICAgICAgICAgICAgICBzdHlsZTogJ2N1cnJlbmN5JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwZXJjZW50OiB7XG4gICAgICAgICAgICAgICAgc3R5bGU6ICdwZXJjZW50JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGU6IHtcbiAgICAgICAgICAgIHNob3J0OiB7XG4gICAgICAgICAgICAgICAgbW9udGg6ICdudW1lcmljJyxcbiAgICAgICAgICAgICAgICBkYXk6ICdudW1lcmljJyxcbiAgICAgICAgICAgICAgICB5ZWFyOiAnMi1kaWdpdCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWVkaXVtOiB7XG4gICAgICAgICAgICAgICAgbW9udGg6ICdzaG9ydCcsXG4gICAgICAgICAgICAgICAgZGF5OiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgeWVhcjogJ251bWVyaWMnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxvbmc6IHtcbiAgICAgICAgICAgICAgICBtb250aDogJ2xvbmcnLFxuICAgICAgICAgICAgICAgIGRheTogJ251bWVyaWMnLFxuICAgICAgICAgICAgICAgIHllYXI6ICdudW1lcmljJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdWxsOiB7XG4gICAgICAgICAgICAgICAgd2Vla2RheTogJ2xvbmcnLFxuICAgICAgICAgICAgICAgIG1vbnRoOiAnbG9uZycsXG4gICAgICAgICAgICAgICAgZGF5OiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgeWVhcjogJ251bWVyaWMnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgdGltZToge1xuICAgICAgICAgICAgc2hvcnQ6IHtcbiAgICAgICAgICAgICAgICBob3VyOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgbWludXRlOiAnbnVtZXJpYycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWVkaXVtOiB7XG4gICAgICAgICAgICAgICAgaG91cjogJ251bWVyaWMnLFxuICAgICAgICAgICAgICAgIG1pbnV0ZTogJ251bWVyaWMnLFxuICAgICAgICAgICAgICAgIHNlY29uZDogJ251bWVyaWMnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxvbmc6IHtcbiAgICAgICAgICAgICAgICBob3VyOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgbWludXRlOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgc2Vjb25kOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgdGltZVpvbmVOYW1lOiAnc2hvcnQnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bGw6IHtcbiAgICAgICAgICAgICAgICBob3VyOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgbWludXRlOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgc2Vjb25kOiAnbnVtZXJpYycsXG4gICAgICAgICAgICAgICAgdGltZVpvbmVOYW1lOiAnc2hvcnQnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICB9O1xuICAgIHJldHVybiBJbnRsTWVzc2FnZUZvcm1hdDtcbn0oKSk7XG5leHBvcnQgeyBJbnRsTWVzc2FnZUZvcm1hdCB9O1xuZXhwb3J0IGRlZmF1bHQgSW50bE1lc3NhZ2VGb3JtYXQ7XG4iLCIvKlxuQ29weXJpZ2h0IChjKSAyMDE0LCBZYWhvbyEgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuQ29weXJpZ2h0cyBsaWNlbnNlZCB1bmRlciB0aGUgTmV3IEJTRCBMaWNlbnNlLlxuU2VlIHRoZSBhY2NvbXBhbnlpbmcgTElDRU5TRSBmaWxlIGZvciB0ZXJtcy5cbiovXG5pbXBvcnQgSW50bE1lc3NhZ2VGb3JtYXQgZnJvbSAnLi9jb3JlJztcbmV4cG9ydCAqIGZyb20gJy4vZm9ybWF0dGVycyc7XG5leHBvcnQgKiBmcm9tICcuL2NvcmUnO1xuZXhwb3J0IGRlZmF1bHQgSW50bE1lc3NhZ2VGb3JtYXQ7XG4iLCJpbXBvcnR7d3JpdGFibGUgYXMgbixkZXJpdmVkIGFzIGV9ZnJvbVwic3ZlbHRlL3N0b3JlXCI7aW1wb3J0IHQgZnJvbVwiaW50bC1tZXNzYWdlZm9ybWF0XCI7Y29uc3Qgbz0obixlPVwiXCIpPT57Y29uc3QgdD17fTtmb3IoY29uc3QgciBpbiBuKXtjb25zdCBpPWUrcjtcIm9iamVjdFwiPT10eXBlb2YgbltyXT9PYmplY3QuYXNzaWduKHQsbyhuW3JdLGAke2l9LmApKTp0W2ldPW5bcl19cmV0dXJuIHR9O2xldCByO2NvbnN0IGk9bih7fSk7ZnVuY3Rpb24gYShuKXtyZXR1cm4gbiBpbiByfWZ1bmN0aW9uIGwobixlKXtpZihhKG4pKXtjb25zdCB0PWZ1bmN0aW9uKG4pe3JldHVybiByW25dfHxudWxsfShuKTtpZihlIGluIHQpcmV0dXJuIHRbZV19cmV0dXJuIG51bGx9ZnVuY3Rpb24gcyhuLC4uLmUpe2NvbnN0IHQ9ZS5tYXAobj0+byhuKSk7aS51cGRhdGUoZT0+KGVbbl09T2JqZWN0LmFzc2lnbihlW25dfHx7fSwuLi50KSxlKSl9Y29uc3QgYz1lKFtpXSwoW25dKT0+T2JqZWN0LmtleXMobikpO2kuc3Vic2NyaWJlKG49PnI9bik7Y29uc3QgdT17fTtmdW5jdGlvbiBtKG4pe3JldHVybiB1W25dfWZ1bmN0aW9uIGYobil7cmV0dXJuIEUobikucmV2ZXJzZSgpLnNvbWUobSl9Y29uc3QgZD17fTtmdW5jdGlvbiB3KG4pe2lmKCFmKG4pKXJldHVybjtpZihuIGluIGQpcmV0dXJuIGRbbl07Y29uc3QgZT1mdW5jdGlvbihuKXtyZXR1cm4gRShuKS5yZXZlcnNlKCkubWFwKG49Pntjb25zdCBlPW0obik7cmV0dXJuW24sZT9bLi4uZV06W11dfSkuZmlsdGVyKChbLG5dKT0+bi5sZW5ndGg+MCl9KG4pO3JldHVybiAwIT09ZS5sZW5ndGg/KGRbbl09UHJvbWlzZS5hbGwoZS5tYXAoKFtuLGVdKT0+UHJvbWlzZS5hbGwoZS5tYXAobj0+bigpKSkudGhlbihlPT57IWZ1bmN0aW9uKG4pe2RlbGV0ZSB1W25dfShuKSxlPWUubWFwKG49Pm4uZGVmYXVsdHx8bikscyhuLC4uLmUpfSkpKS50aGVuKCgpPT57ZGVsZXRlIGRbbl19KSxkW25dKTp2b2lkIDB9ZnVuY3Rpb24gZyhuLGUpe20obil8fGZ1bmN0aW9uKG4pe3Vbbl09bmV3IFNldH0obik7Y29uc3QgdD1tKG4pO20obikuaGFzKGUpfHwoYShuKXx8aS51cGRhdGUoZT0+KGVbbl09e30sZSkpLHQuYWRkKGUpKX1cbi8qISAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG5MaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2VcbnRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlXG5MaWNlbnNlIGF0IGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuXG5USElTIENPREUgSVMgUFJPVklERUQgT04gQU4gKkFTIElTKiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG5LSU5ELCBFSVRIRVIgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgV0lUSE9VVCBMSU1JVEFUSU9OIEFOWSBJTVBMSUVEXG5XQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgVElUTEUsIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLFxuTUVSQ0hBTlRBQkxJVFkgT1IgTk9OLUlORlJJTkdFTUVOVC5cblxuU2VlIHRoZSBBcGFjaGUgVmVyc2lvbiAyLjAgTGljZW5zZSBmb3Igc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zXG5hbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL2Z1bmN0aW9uIHAobixlKXt2YXIgdD17fTtmb3IodmFyIG8gaW4gbilPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobixvKSYmZS5pbmRleE9mKG8pPDAmJih0W29dPW5bb10pO2lmKG51bGwhPW4mJlwiZnVuY3Rpb25cIj09dHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMpe3ZhciByPTA7Zm9yKG89T2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhuKTtyPG8ubGVuZ3RoO3IrKyllLmluZGV4T2Yob1tyXSk8MCYmT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKG4sb1tyXSkmJih0W29bcl1dPW5bb1tyXV0pfXJldHVybiB0fWNvbnN0IGI9e2ZhbGxiYWNrTG9jYWxlOm51bGwsaW5pdGlhbExvY2FsZTpudWxsLGxvYWRpbmdEZWxheToyMDAsZm9ybWF0czp7bnVtYmVyOntzY2llbnRpZmljOntub3RhdGlvbjpcInNjaWVudGlmaWNcIn0sZW5naW5lZXJpbmc6e25vdGF0aW9uOlwiZW5naW5lZXJpbmdcIn0sY29tcGFjdExvbmc6e25vdGF0aW9uOlwiY29tcGFjdFwiLGNvbXBhY3REaXNwbGF5OlwibG9uZ1wifSxjb21wYWN0U2hvcnQ6e25vdGF0aW9uOlwiY29tcGFjdFwiLGNvbXBhY3REaXNwbGF5Olwic2hvcnRcIn19LGRhdGU6e3Nob3J0Onttb250aDpcIm51bWVyaWNcIixkYXk6XCJudW1lcmljXCIseWVhcjpcIjItZGlnaXRcIn0sbWVkaXVtOnttb250aDpcInNob3J0XCIsZGF5OlwibnVtZXJpY1wiLHllYXI6XCJudW1lcmljXCJ9LGxvbmc6e21vbnRoOlwibG9uZ1wiLGRheTpcIm51bWVyaWNcIix5ZWFyOlwibnVtZXJpY1wifSxmdWxsOnt3ZWVrZGF5OlwibG9uZ1wiLG1vbnRoOlwibG9uZ1wiLGRheTpcIm51bWVyaWNcIix5ZWFyOlwibnVtZXJpY1wifX0sdGltZTp7c2hvcnQ6e2hvdXI6XCJudW1lcmljXCIsbWludXRlOlwibnVtZXJpY1wifSxtZWRpdW06e2hvdXI6XCJudW1lcmljXCIsbWludXRlOlwibnVtZXJpY1wiLHNlY29uZDpcIm51bWVyaWNcIn0sbG9uZzp7aG91cjpcIm51bWVyaWNcIixtaW51dGU6XCJudW1lcmljXCIsc2Vjb25kOlwibnVtZXJpY1wiLHRpbWVab25lTmFtZTpcInNob3J0XCJ9LGZ1bGw6e2hvdXI6XCJudW1lcmljXCIsbWludXRlOlwibnVtZXJpY1wiLHNlY29uZDpcIm51bWVyaWNcIix0aW1lWm9uZU5hbWU6XCJzaG9ydFwifX19LHdhcm5Pbk1pc3NpbmdNZXNzYWdlczohMH07ZnVuY3Rpb24gaCgpe3JldHVybiBifWZ1bmN0aW9uIHkobil7Y29uc3R7Zm9ybWF0czplfT1uLHQ9cChuLFtcImZvcm1hdHNcIl0pLG89bi5pbml0aWFsTG9jYWxlfHxuLmZhbGxiYWNrTG9jYWxlO3JldHVybiBPYmplY3QuYXNzaWduKGIsdCx7aW5pdGlhbExvY2FsZTpvfSksZSYmKFwibnVtYmVyXCJpbiBlJiZPYmplY3QuYXNzaWduKGIuZm9ybWF0cy5udW1iZXIsZS5udW1iZXIpLFwiZGF0ZVwiaW4gZSYmT2JqZWN0LmFzc2lnbihiLmZvcm1hdHMuZGF0ZSxlLmRhdGUpLFwidGltZVwiaW4gZSYmT2JqZWN0LmFzc2lnbihiLmZvcm1hdHMudGltZSxlLnRpbWUpKSxqLnNldChvKX1jb25zdCBPPW4oITEpO2xldCB2O2NvbnN0IGo9bihudWxsKTtmdW5jdGlvbiBMKG4sZSl7cmV0dXJuIDA9PT1lLmluZGV4T2YobikmJm4hPT1lfWZ1bmN0aW9uIGsobixlKXtyZXR1cm4gbj09PWV8fEwobixlKXx8TChlLG4pfWZ1bmN0aW9uIHgobil7Y29uc3QgZT1uLmxhc3RJbmRleE9mKFwiLVwiKTtpZihlPjApcmV0dXJuIG4uc2xpY2UoMCxlKTtjb25zdHtmYWxsYmFja0xvY2FsZTp0fT1oKCk7cmV0dXJuIHQmJiFrKG4sdCk/dDpudWxsfWZ1bmN0aW9uIEUobil7Y29uc3QgZT1uLnNwbGl0KFwiLVwiKS5tYXAoKG4sZSx0KT0+dC5zbGljZSgwLGUrMSkuam9pbihcIi1cIikpLHtmYWxsYmFja0xvY2FsZTp0fT1oKCk7cmV0dXJuIHQmJiFrKG4sdCk/ZS5jb25jYXQoRSh0KSk6ZX1mdW5jdGlvbiAkKCl7cmV0dXJuIHZ9ai5zdWJzY3JpYmUobj0+e3Y9bixcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93JiZkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKFwibGFuZ1wiLG4pfSk7Y29uc3QgRD1qLnNldDtqLnNldD1uPT57aWYoZnVuY3Rpb24gbihlKXtyZXR1cm4gbnVsbD09ZXx8YShlKT9lOm4oeChlKSl9KG4pJiZmKG4pKXtjb25zdCBlPWgoKS5sb2FkaW5nRGVsYXk7bGV0IHQ7cmV0dXJuXCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdyYmbnVsbCE9JCgpJiZlP3Q9d2luZG93LnNldFRpbWVvdXQoKCk9Pk8uc2V0KCEwKSxlKTpPLnNldCghMCksdyhuKS50aGVuKCgpPT57RChuKX0pLmZpbmFsbHkoKCk9PntjbGVhclRpbWVvdXQodCksTy5zZXQoITEpfSl9cmV0dXJuIEQobil9LGoudXBkYXRlPW49PkQobih2KSk7Y29uc3QgST0obixlKT0+e2NvbnN0IHQ9bi5zcGxpdChcIiZcIikuZmluZChuPT4wPT09bi5pbmRleE9mKGAke2V9PWApKTtyZXR1cm4gdD90LnNwbGl0KFwiPVwiKS5wb3AoKTpudWxsfSxOPShuLGUpPT57Y29uc3QgdD1lLmV4ZWMobik7cmV0dXJuIHQmJnRbMV18fG51bGx9LFA9bj0+XCJ1bmRlZmluZWRcIj09dHlwZW9mIHdpbmRvdz9udWxsOk4od2luZG93LmxvY2F0aW9uLmhvc3RuYW1lLG4pLFM9bj0+XCJ1bmRlZmluZWRcIj09dHlwZW9mIHdpbmRvdz9udWxsOk4od2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLG4pLFQ9KCk9PlwidW5kZWZpbmVkXCI9PXR5cGVvZiB3aW5kb3c/bnVsbDp3aW5kb3cubmF2aWdhdG9yLmxhbmd1YWdlfHx3aW5kb3cubmF2aWdhdG9yLmxhbmd1YWdlc1swXSxBPW49PlwidW5kZWZpbmVkXCI9PXR5cGVvZiB3aW5kb3c/bnVsbDpJKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpLG4pLE09bj0+XCJ1bmRlZmluZWRcIj09dHlwZW9mIHdpbmRvdz9udWxsOkkod2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyKDEpLG4pLEY9e30sWj0obixlKT0+e2lmKG51bGw9PWUpcmV0dXJuIG51bGw7Y29uc3QgdD1sKGUsbik7cmV0dXJuIHR8fFoobix4KGUpKX0sQz0obixlKT0+e2lmKGUgaW4gRiYmbiBpbiBGW2VdKXJldHVybiBGW2VdW25dO2NvbnN0IHQ9WihuLGUpO3JldHVybiB0PygobixlLHQpPT50PyhlIGluIEZ8fChGW2VdPXt9KSxuIGluIEZbZV18fChGW2VdW25dPXQpLHQpOnQpKG4sZSx0KTpudWxsfSxKPW49Pntjb25zdCBlPU9iamVjdC5jcmVhdGUobnVsbCk7cmV0dXJuIHQ9Pntjb25zdCBvPUpTT04uc3RyaW5naWZ5KHQpO3JldHVybiBvIGluIGU/ZVtvXTplW29dPW4odCl9fSxVPShuLGUpPT57Y29uc3QgdD1oKCkuZm9ybWF0cztpZihuIGluIHQmJmUgaW4gdFtuXSlyZXR1cm4gdFtuXVtlXTt0aHJvdyBuZXcgRXJyb3IoYFtzdmVsdGUtaTE4bl0gVW5rbm93biBcIiR7ZX1cIiAke259IGZvcm1hdC5gKX0sXz1KKG49Pnt2YXJ7bG9jYWxlOmUsZm9ybWF0OnR9PW4sbz1wKG4sW1wibG9jYWxlXCIsXCJmb3JtYXRcIl0pO2lmKG51bGw9PWUpdGhyb3cgbmV3IEVycm9yKCdbc3ZlbHRlLWkxOG5dIEEgXCJsb2NhbGVcIiBtdXN0IGJlIHNldCB0byBmb3JtYXQgbnVtYmVycycpO3JldHVybiB0JiYobz1VKFwibnVtYmVyXCIsdCkpLG5ldyBJbnRsLk51bWJlckZvcm1hdChlLG8pfSkscT1KKG49Pnt2YXJ7bG9jYWxlOmUsZm9ybWF0OnR9PW4sbz1wKG4sW1wibG9jYWxlXCIsXCJmb3JtYXRcIl0pO2lmKG51bGw9PWUpdGhyb3cgbmV3IEVycm9yKCdbc3ZlbHRlLWkxOG5dIEEgXCJsb2NhbGVcIiBtdXN0IGJlIHNldCB0byBmb3JtYXQgZGF0ZXMnKTtyZXR1cm4gdD9vPVUoXCJkYXRlXCIsdCk6MD09PU9iamVjdC5rZXlzKG8pLmxlbmd0aCYmKG89VShcImRhdGVcIixcInNob3J0XCIpKSxuZXcgSW50bC5EYXRlVGltZUZvcm1hdChlLG8pfSksej1KKG49Pnt2YXJ7bG9jYWxlOmUsZm9ybWF0OnR9PW4sbz1wKG4sW1wibG9jYWxlXCIsXCJmb3JtYXRcIl0pO2lmKG51bGw9PWUpdGhyb3cgbmV3IEVycm9yKCdbc3ZlbHRlLWkxOG5dIEEgXCJsb2NhbGVcIiBtdXN0IGJlIHNldCB0byBmb3JtYXQgdGltZSB2YWx1ZXMnKTtyZXR1cm4gdD9vPVUoXCJ0aW1lXCIsdCk6MD09PU9iamVjdC5rZXlzKG8pLmxlbmd0aCYmKG89VShcInRpbWVcIixcInNob3J0XCIpKSxuZXcgSW50bC5EYXRlVGltZUZvcm1hdChlLG8pfSksQj0obj17fSk9Pnt2YXJ7bG9jYWxlOmU9JCgpfT1uLHQ9cChuLFtcImxvY2FsZVwiXSk7cmV0dXJuIF8oT2JqZWN0LmFzc2lnbih7bG9jYWxlOmV9LHQpKX0sRz0obj17fSk9Pnt2YXJ7bG9jYWxlOmU9JCgpfT1uLHQ9cChuLFtcImxvY2FsZVwiXSk7cmV0dXJuIHEoT2JqZWN0LmFzc2lnbih7bG9jYWxlOmV9LHQpKX0sSD0obj17fSk9Pnt2YXJ7bG9jYWxlOmU9JCgpfT1uLHQ9cChuLFtcImxvY2FsZVwiXSk7cmV0dXJuIHooT2JqZWN0LmFzc2lnbih7bG9jYWxlOmV9LHQpKX0sSz1KKChuLGU9JCgpKT0+bmV3IHQobixlLGgoKS5mb3JtYXRzKSksUT0obixlPXt9KT0+e1wib2JqZWN0XCI9PXR5cGVvZiBuJiYobj0oZT1uKS5pZCk7Y29uc3R7dmFsdWVzOnQsbG9jYWxlOm89JCgpLGRlZmF1bHQ6cn09ZTtpZihudWxsPT1vKXRocm93IG5ldyBFcnJvcihcIltzdmVsdGUtaTE4bl0gQ2Fubm90IGZvcm1hdCBhIG1lc3NhZ2Ugd2l0aG91dCBmaXJzdCBzZXR0aW5nIHRoZSBpbml0aWFsIGxvY2FsZS5cIik7Y29uc3QgaT1DKG4sbyk7cmV0dXJuIGk/dD9LKGksbykuZm9ybWF0KHQpOmk6KGgoKS53YXJuT25NaXNzaW5nTWVzc2FnZXMmJmNvbnNvbGUud2FybihgW3N2ZWx0ZS1pMThuXSBUaGUgbWVzc2FnZSBcIiR7bn1cIiB3YXMgbm90IGZvdW5kIGluIFwiJHtFKG8pLmpvaW4oJ1wiLCBcIicpfVwiLiR7ZigkKCkpP1wiXFxuXFxuTm90ZTogdGhlcmUgYXJlIGF0IGxlYXN0IG9uZSBsb2FkZXIgc3RpbGwgcmVnaXN0ZXJlZCB0byB0aGlzIGxvY2FsZSB0aGF0IHdhc24ndCBleGVjdXRlZC5cIjpcIlwifWApLHJ8fG4pfSxSPShuLGUpPT5IKGUpLmZvcm1hdChuKSxWPShuLGUpPT5HKGUpLmZvcm1hdChuKSxXPShuLGUpPT5CKGUpLmZvcm1hdChuKSxYPWUoW2osaV0sKCk9PlEpLFk9ZShbal0sKCk9PlIpLG5uPWUoW2pdLCgpPT5WKSxlbj1lKFtqXSwoKT0+Vyk7ZnVuY3Rpb24gdG4obil7cmV0dXJuIG59ZnVuY3Rpb24gb24obil7cmV0dXJuIHcobnx8JCgpfHxoKCkuaW5pdGlhbExvY2FsZSl9ZXhwb3J0e1ggYXMgXyxzIGFzIGFkZE1lc3NhZ2VzLG5uIGFzIGRhdGUsdG4gYXMgZGVmaW5lTWVzc2FnZXMsaSBhcyBkaWN0aW9uYXJ5LFggYXMgZm9ybWF0LEcgYXMgZ2V0RGF0ZUZvcm1hdHRlcixNIGFzIGdldExvY2FsZUZyb21IYXNoLFAgYXMgZ2V0TG9jYWxlRnJvbUhvc3RuYW1lLFQgYXMgZ2V0TG9jYWxlRnJvbU5hdmlnYXRvcixTIGFzIGdldExvY2FsZUZyb21QYXRobmFtZSxBIGFzIGdldExvY2FsZUZyb21RdWVyeVN0cmluZyxLIGFzIGdldE1lc3NhZ2VGb3JtYXR0ZXIsQiBhcyBnZXROdW1iZXJGb3JtYXR0ZXIsSCBhcyBnZXRUaW1lRm9ybWF0dGVyLHkgYXMgaW5pdCxPIGFzIGlzTG9hZGluZyxqIGFzIGxvY2FsZSxjIGFzIGxvY2FsZXMsZW4gYXMgbnVtYmVyLGcgYXMgcmVnaXN0ZXIsWCBhcyB0LFkgYXMgdGltZSxvbiBhcyB3YWl0TG9jYWxlfTtcbiIsImltcG9ydCB7IHJlZ2lzdGVyLCBpbml0LCBnZXRMb2NhbGVGcm9tTmF2aWdhdG9yIH0gZnJvbSAnc3ZlbHRlLWkxOG4nXHJcblxyXG5yZWdpc3RlcignZW4nLCAoKSA9PiBpbXBvcnQoJy4uL2xvY2FsZXMvZW4uanNvbicpKTtcclxuXHJcbmluaXQoe1xyXG4gIGZhbGxiYWNrTG9jYWxlOiAnZW4nLFxyXG4gIGluaXRpYWxMb2NhbGU6IGdldExvY2FsZUZyb21OYXZpZ2F0b3IoKSxcclxufSk7IiwiaW1wb3J0ICogYXMgc2FwcGVyIGZyb20gJ0BzYXBwZXIvYXBwJztcblxuaW1wb3J0IFwiLi9pMThuLmpzXCI7XG5cbnNhcHBlci5zdGFydCh7XG5cdHRhcmdldDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NhcHBlcicpXG59KTsiXSwibmFtZXMiOlsiRXJyb3JDb21wb25lbnQiLCJkZXRhY2giLCJyb290X3ByZWxvYWQiLCJ0aGlzIiwiX19hc3NpZ24iLCJfX3NwcmVhZEFycmF5cyIsIl9fZXh0ZW5kcyIsIm1lbW9pemVJbnRsQ29uc3RydWN0b3IiLCJuIiwiZSIsInQiLCJyZWdpc3RlciIsImluaXQiLCJnZXRMb2NhbGVGcm9tTmF2aWdhdG9yIiwic2FwcGVyLnN0YXJ0Il0sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLElBQUksR0FBRyxHQUFHO0FBRW5CLFNBQVMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUU7QUFDMUI7QUFDQSxJQUFJLEtBQUssTUFBTSxDQUFDLElBQUksR0FBRztBQUN2QixRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEIsSUFBSSxPQUFPLEdBQUcsQ0FBQztBQUNmLENBQUM7QUFJRCxTQUFTLFlBQVksQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO0FBQ3pELElBQUksT0FBTyxDQUFD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TSxJQUFJLFNBQVMsQ0FBQyxFQUFFO0FBQzVDLFFBQVEsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDN0QsWUFBWSxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCLFlBQVksS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMzRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixTQUFTO0FBQ1QsUUFBUSxPQUFPLENBQUMsQ0FBQztBQUNqQixLQUFLLENBQUM7QUFDTixJQUFJLE9BQU9BLFVBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQztBQUNGLEFBR0E7QUFDQSxTQUFTLFdBQVcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQzdCLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRTtBQUNiLFFBQVEsT0FBTyxFQUFFLENBQUM7QUFDbEIsS0FBSztBQUNMLElBQUksT0FBT0EsVUFBUSxDQUFDQSxVQUFRLENBQUNBLFVBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLEVBQUU7QUFDN0csUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUdBLFVBQVEsQ0FBQ0EsVUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUks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QUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUNDLFFBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsTUFBTSxDQUFDLENBQUNDLE9BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUM7QUFDeGtDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0ZBQWdGLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxPQUFPLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUNELFFBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDQSxRQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxPQUFPLE1BQU0sRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFNLFdBQVcsRUFBRSxPQUFPLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBSyxNQUEwUixDQUFDLENBQUMsSUFBSSxXQUFXLEVBQUUsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFxSixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxzREFBc0QsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLDREQUE0RCxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsSUFBSUUsaUJBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUZBQWlGLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMscUJBQXFCLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQywrRkFBK0YsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDRCxPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUNBLE9BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDQSxPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQ0EsT0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7O0FDWnp5SkUsQ0FBUSxDQUFDLElBQUksRUFBRSxNQUFNLE9BQU8sa0JBQW9CLENBQUMsQ0FBQyxDQUFDO0FBQ25EO0FBQ0FDLENBQUksQ0FBQztBQUNMLEVBQUUsY0FBYyxFQUFFLElBQUk7QUFDdEIsRUFBRSxhQUFhLEVBQUVDLENBQXNCLEVBQUU7QUFDekMsQ0FBQyxDQUFDOztHQUFDLEhDSEhDLEtBQVksQ0FBQztBQUNiLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDO0FBQzFDLENBQUMsQ0FBQzs7OzsifQ==
