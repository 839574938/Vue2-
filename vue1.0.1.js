(function (global, factory) {
    // 用来判断当前的环境，改如何暴露方法
    // 处于nodeJs环境 commentJs
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        // 处于require.js sea.js 环境
        typeof define === 'function' && define.amd ? define(factory) :
            (global.Vue = factory());
})(this, function () {

    var ASSET_TYPES = [
        'component',
        'directive',
        'filter'
    ];

    var LIFECYCLE_HOOKS = [
        'beforeCreate',
        'created',
        'beforeMount',
        'mounted',
        'beforeUpdate',
        'updated',
        'beforeDestroy',
        'destroyed',
        'activated',
        'deactivated',
        'errorCaptured'
    ];

    var _Set;
    /* istanbul ignore if */ // $flow-disable-line
    if (typeof Set !== 'undefined' && isNative(Set)) {
        // use native Set when available.
        _Set = Set;
    } else {
        // a non-standard Set polyfill that only works with primitive keys.
        _Set = /*@__PURE__*/ (function () {
            function Set() {
                this.set = Object.create(null);
            }

            Set.prototype.has = function has(key) {
                return this.set[key] === true
            };
            Set.prototype.add = function add(key) {
                this.set[key] = true;
            };
            Set.prototype.clear = function clear() {
                this.set = Object.create(null);
            };

            return Set;
        }());
    }

    var arrayProto = Array.prototype;
    var arrayMethods = Object.create(arrayProto);
    var arrayKeys = Object.getOwnPropertyNames(arrayMethods);


    var methodsToPatch = [
        'push',
        'pop',
        'shift',
        'unshift',
        'splice',
        'sort',
        'reverse'
    ];

    function copyAugment(target, src, keys) {
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i];
            def(target, key, src[key]);
        }
    }

    function protoAugment(target, src) {
        /* eslint-disable no-proto */
        target.__proto__ = src;
        /* eslint-enable no-proto */
    }


    /**
     * Intercept mutating methods and emit events
     */
    methodsToPatch.forEach(function (method) {
        var original = arrayProto[method];	//比如用的是push的方法 就拿到push的方法
        def(arrayMethods, method, function mutator() {	//往arrayMethods里面添加变异数组方法
            var args = [],
                len = arguments.length;
            while (len--) args[len] = arguments[len];

            var result = original.apply(this, args);	//返回array.prototype.push执行完毕之后返回的值
            var ob = this.__ob__;
            var inserted;
            switch (method) {
                case 'push':
                case 'unshift':
                    inserted = args;
                    break
                case 'splice':
                    inserted = args.slice(2);
                    break
            }
            if (inserted) {
                ob.observeArray(inserted);
            }
            // notify change
            ob.dep.notify();
            return result
        });
    });


    var hasProto = '__proto__' in {};

    // Browser environment sniffing
    var inBrowser = typeof window !== 'undefined';
    var inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform;


    var shouldObserve = true;

    function toggleObserving(value) {
        shouldObserve = value;
    }

    var _isServer;
    var isServerRendering = function () {
        if (_isServer === undefined) {
            /* istanbul ignore if */
            if (!inBrowser && !inWeex && typeof global !== 'undefined') {
                // detect presence of vue-server-renderer and avoid
                // Webpack shimming the process
                _isServer = global['process'] && global['process'].env.VUE_ENV === 'server';
            } else {
                _isServer = false;
            }
        }
        return _isServer
    };


    var noop = function () {
    }

    //检测开头否
    function isReserved(str) {
        var c = (str + '').charCodeAt(0);
        return c === 0x24 || c === 0x5F
    }

    var _toString = Object.prototype.toString;

    function isPlainObject(obj) {
        return _toString.call(obj) === '[object Object]'
    }

    function isObject(obj) {
        return obj !== null && typeof obj === 'object'
    }

    function isNative(Ctor) {
        return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
    }

    function callHook(vm, hook) {
        var handlers = vm.$options[hook];
        if (handlers) {
            for (var i = 0, j = handlers.length; i < j; i++) {
                try {
                    handlers[i].call(vm);
                } catch (e) {
                    handleError(e, vm, (hook + " hook"));
                }
            }
        }
        if (vm._hasHookEvent) {
            vm.$emit('hook:' + hook);
        }
    }


    var hasOwnProperty = Object.prototype.hasOwnProperty;

    function hasOwn(obj, key) {
        return hasOwnProperty.call(obj, key)
    }

    var config = {
        optionMergeStrategies: Object.create(null)
    };


    //自定义策略函数
    var strats = config.optionMergeStrategies;
    //el
    strats.el = function (parent, child, vm, key) {
        if (!vm) {
            console.warn(
                "option \"" + key + "\" can only be used during instance " +
                'creation with the `new` keyword.'
            );
        }

        return defaultStrat(parent, child)
    };
    //data
    strats.data = function (parentVal, childVal, vm) {
        if (!vm) {
            //组件的判断
            if (childVal && typeof childVal !== 'function') {
                console.error(
                    'The "data" option should be a function ' +
                    'that returns a per-instance value in component ' +
                    'definitions.'
                );

                return parentVal
            }
            return mergeDataOrFn(parentVal, childVal)
        }

        return mergeDataOrFn(parentVal, childVal, vm)
    };

    function mergeDataOrFn(parentVal, childVal, vm) {
        return function mergedInstanceDataFn() {
            // instance merge
            var instanceData = typeof childVal === 'function' ?
                childVal.call(vm, vm) :
                childVal;
            var defaultData = typeof parentVal === 'function' ?
                parentVal.call(vm, vm) :
                parentVal;
            if (instanceData) {
                return mergeData(instanceData, defaultData)
            } else {
                return defaultData
            }
        }
    }

    function mergeData(to, from) {
        if (!from) {
            return to
        }
        var key, toVal, fromVal;
        var keys = Object.keys(from);
        for (var i = 0; i < keys.length; i++) {
            key = keys[i];
            toVal = to[key];
            fromVal = from[key];
            if (!hasOwn(to, key)) {
                set(to, key, fromVal);
            } else if (
                toVal !== fromVal &&
                isPlainObject(toVal) &&
                isPlainObject(fromVal)
            ) {
                mergeData(toVal, fromVal);
            }
        }
        return to
    }

    function mergeHook(parentVal, childVal) {
        return childVal ?
            parentVal ?
                parentVal.concat(childVal) :
                Array.isArray(childVal) ?
                    childVal : [childVal] :
            parentVal;
    }

    LIFECYCLE_HOOKS.forEach(function (hook) {
        strats[hook] = mergeHook;
    });

    //默认策略函数
    var defaultStrat = function (parentVal, childVal) {
        return childVal === undefined ?
            parentVal :
            childVal;
    };

    // parent Vue.options  ， child 配置对象 vm 实例对象 ，处理组件为undefined
    function mergeOptions(parent, child, vm) {
        var options = {};
        for (var key in parent) {
            mergeField(key);
        }

        for (var key in child) {
            if (!hasOwn(parent, key)) {
                mergeField(key);
            }
        }

        //自定义策略的处理函数
        function mergeField(key) {
            var strat = strats[key] || defaultStrat;
            options[key] = strat(parent[key], child[key], vm, key)
        }

        return options;
    }

    function resolveConstructorOptions(Ctor) {
        var options = Ctor.options; //拿到 Vue.options 里面的值
        return options;
    }

    var hasProxy = typeof Proxy !== 'undefined' && isNative(Proxy);

    var hasHandler = {
        has: function has(target, key) {
            var has = key in target;
            var isAllowed = allowedGlobals(key) ||
                (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data));
            if (!has && !isAllowed) {
                if (key in target.$data) {
                    warnReservedPrefix(target, key);
                } else {
                    warnNonPresent(target, key);
                }
            }
            return has || !isAllowed
        }
    };

    // 2020.4.17目前位置  录播77.11
    var initProxy = function (vm) {
        if (hasProxy) {
            // determine which proxy handler to use
            var options = vm.$options;
            var handlers = options.render && options.render._withStripped ?
                getHandler :
                hasHandler;
            vm._renderProxy = new Proxy(vm, handlers);
        } else {
            vm._renderProxy = vm;
        }
    }

    function initData(vm) {
        var data = vm.$options.data;
        data = vm._data = typeof data === 'function' ?
            data.call(vm, vm) :
            data || {};
        if (!isPlainObject(data)) {
            data = {};
            console.error(
                'data functions should return an object:\n' +
                'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
                vm
            );
        }
        // proxy data on instance
        var keys = Object.keys(data);
        var props = vm.$options.props;
        var methods = vm.$options.methods;
        var i = keys.length;
        while (i--) {
            var key = keys[i];
            {
                if (methods && hasOwn(methods, key)) {
                    warn(
                        ("Method \"" + key + "\" has already been defined as a data property."),
                        vm
                    );
                }
            }
            if (props && hasOwn(props, key)) {
                warn(
                    "The data property \"" + key + "\" is already declared as a prop. " +
                    "Use prop default value instead.",
                    vm
                );
            } else if (!isReserved(key)) {
                proxy(vm, "_data", key);
            }
        }
        // observe data
        observe(data, true /* asRootData */);
    }

    function observe(value, asRootData) {
        if (!isObject(value) || value instanceof VNode) {
            return
        }

        var ob;
        //1.检验是否有__ob__属性   2.防止用户扩展属性
        if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
            ob = value.__ob__;
        } else if (
            shouldObserve &&
            !isServerRendering() &&
            (Array.isArray(value) || isPlainObject(value)) &&
            Object.isExtensible(value) &&
            !value._isVue
        ) {
            ob = new Observer(value);
        }

        if (asRootData && ob) {
            ob.vmCount++;
        }

        return ob;
    }

    function def(obj, key, val, enumerable) {
        Object.defineProperty(obj, key, {
            value: val,
            enumerable: !!enumerable,
            writable: true,
            configurable: true
        });
    }


    function Observer(value) {
        this.value = value;
        this.dep = new Dep();
        this.vmCount = 0;
        def(value, '__ob__', this);	//给value设置__ob__的参数值为Observer
        if (Array.isArray(value)) {
            if (hasProto) {	//判断浏览器是否支持__proto__  兼容
                protoAugment(value, arrayMethods);
            } else {
                copyAugment(value, arrayMethods, arrayKeys);
            }
            this.observeArray(value);
        } else {
            this.walk(value);
        }
    }

    Observer.prototype.walk = function (obj) {
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            defineReactive$$1(obj, keys[i]);
        }
    };

    Observer.prototype.observeArray = function observeArray(items) {
        for (var i = 0, l = items.length; i < l; i++) {
            observe(items[i]);
        }
    };

    function defineReactive$$1(obj, key, val, customSetter, shallow) {

        var dep = new Dep();       //创建一个容器

        //获取obj里面的描述对象  以防之前定义了get，set函数
        var property = Object.getOwnPropertyDescriptor(obj, key);
        if (property && property.configurable === false) {
            return
        }

        // cater for pre-defined getter/setters
        var getter = property && property.get;
        var setter = property && property.set;

        //边界处理 响应式数据的一致化
        if ((!getter || setter) && arguments.length === 2) {
            val = obj[key];
        }

        //是否要升读观测
        var childOb = !shallow && observe(val);


        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get: function reactiveGetter() {
                //如果get有值就执行
                var value = getter ? getter.call(obj) : val;
                if (Dep.target) {
                    dep.depend();
                    if (childOb) {
                        childOb.dep.depend();
                        if (Array.isArray(value)) {
                            dependArray(value);
                        }
                    }
                }
                return value
            },
            set: function reactiveSetter(newVal) {

                var value = getter ? getter.call(obj) : val;
                /* eslint-disable no-self-compare */
                if (newVal === value || (newVal !== newVal && value !== value)) {
                    return
                }
                /* eslint-enable no-self-compare */
                if (customSetter) {
                    customSetter();
                }
                // #7981: for accessor properties without setter
                if (getter && !setter) {
                    return
                }
                if (setter) {
                    setter.call(obj, newVal);
                } else {
                    val = newVal;
                }
                childOb = !shallow && observe(newVal);
                dep.notify();
            }
        });
    }

    function VNode() {

    }


    var uid = 0;

    function Dep() {
        this.id = uid++;    //容器的编号
        this.subs = [];     //观察者实例
    }

    Dep.prototype.depend = function () {
        if (Dep.target) {
            Dep.target.addDep(this);
        }
    }

    Dep.prototype.addSub = function (sub) {     //这里的sub 就是watcher实例
        this.subs.push(sub);
    }

    Dep.prototype.notify = function() {
        var subs = this.subs.slice();
        if (!config.async) {
            // subs aren't sorted in scheduler if not running async
            // we need to sort them now to make sure they fire in correct
            // order
            subs.sort(function(a, b) {
                return a.id - b.id;
            });
        }
        for (var i = 0, l = subs.length; i < l; i++) {
            subs[i].update();
        }
    }

    Dep.target = null;
    var targetStack = [];

    function pushTarget(target) {
        targetStack.push(target);
        Dep.target = target;
    }

    function popTarget() {
        targetStack.pop();
        Dep.target = targetStack[targetStack.length - 1];
    }


    //共享属性对象
    var sharedPropertyDefinition = {
        enumerable: true,
        configurable: true,
        get: noop,
        set: noop
    };

    function proxy(target, sourceKey, key) {
        sharedPropertyDefinition.get = function proxyGetter() {
            return this[sourceKey][key]	//在此处返回_data里面的数据
        };
        sharedPropertyDefinition.set = function proxySetter(val) {
            this[sourceKey][key] = val;
        };
        //vm.message = vm._data.message的应用
        Object.defineProperty(target, key, sharedPropertyDefinition);
    }

    function initState(vm) {
        vm._watchers = [];
        var opts = vm.$options;
        if (opts.data) {
            initData(vm);
        } else {
            observe(vm._data = {}, true /* asRootData */);
        }
    }

    function initMixin(Vue) {
        Vue.prototype._init = function (options) {
            var vm = this;
            vm._isVue = true;
            //选项的处理
            vm.$options = mergeOptions(
                resolveConstructorOptions(vm.constructor),
                options || {},
                vm
            );

            initProxy(vm); //渲染函数的作用域代理
            callHook(vm, 'beforeCreate'); //执行钩子函数
            initState(vm);

            if (vm.$options.el) {
                vm.$mount(vm.$options.el);
            }
        }
    }


    /**
     * 设置vue.config的权限，只允许get 不允许set
     * @param Vue
     */
    function initGlobalApi(Vue) {
        var configDef = {};
        configDef.get = function () {
            return config;
        };
        configDef.set = function () {
            console.error(
                'Do not replace the Vue.config object, set individual fields instead.'
            )
        };
        Object.defineProperty(Vue, 'config', configDef);
    }

    function mountComponent(vm, el, hydrating) {
        var updateComponent = function () {
            //vm._update(vm._render(), hydrating);
            vm._render();
            //调用vm._render 会产出VNode
            //vm._update 渲染成dom
        };

        new Watcher(vm, updateComponent, noop, {
            before: function before() {
                if (vm._isMounted && !vm._isDestroyed) {
                    callHook(vm, 'beforeUpdate');
                }
            }
        }, true /* isRenderWatcher */);
    }

    //vm Vue实例  expOrFn表达式 isRenderWatcher 是否是渲染函数的观察者
    function Watcher(vm, expOrFn, cb, options, isRenderWatcher) {
        this.vm = vm;
        this.deps = [];
        this.newDeps = [];
        this.depIds = new _Set();   //避免重复的依赖收集 移除
        this.newDepIds = new _Set();
        this.expression = expOrFn.toString();

        if (typeof expOrFn === 'function') {
            this.getter = expOrFn;
        }

        this.value = this.lazy ? undefined : this.get();
    }

    Watcher.prototype.get = function () {
        pushTarget(this);
        var vm = this.vm;
        var value = this.getter.call(vm, vm);     //updateComponent with语句
        return value;
    }

    Watcher.prototype.addDep = function (dep) {
        var id = dep.id;
        if (!this.newDepIds.has(id)) {
            this.newDepIds.add(id);
            this.newDeps.push(dep);
            if (!this.depIds.has(id)) {
                dep.addSub(this);
            }
        }
    }

    Watcher.prototype.update = function () {
        console.log("更新试图")
    }



    function Vue(options) {
        if (!(this instanceof Vue)) {
            console.error('Vue is a constructor and should be called with the `new` keyword');
        }
        this._init(options);
    }

    Vue.prototype.$mount = function (el, hydrating) {
        // el = el && inBrowser ? query(el) : undefined;
        return mountComponent(this, el, hydrating)  //魔版已经编译成render function
    };

    Vue.prototype._render = function () {
        with (this) {
            return "_c('div', {attrs: {'id': 'app'}}, [_v('\n\t\t\t' + _s(" + msg + ") + '\n\t\t')])"
        }
    }

    //给Vue设置options,意思是parent里面的值
    Vue.options = Object.create(null);
    ASSET_TYPES.forEach(function (type) {
        Vue.options[type + 's'] = Object.create(null);
    });


    initMixin(Vue);
    initGlobalApi(Vue);

    return Vue;
});
