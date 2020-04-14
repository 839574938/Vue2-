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
    strats.data = function () {
        return function mergedInstanceDataFn() {
        }
    };

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
        var options = Ctor.options;     //拿到 Vue.options 里面的值
        return options;
    }

    function initMixin(Vue) {
        Vue.prototype._init = function (options) {
            var vm = this;

            //选项的处理
            vm.$options = mergeOptions(
                resolveConstructorOptions(vm.constructor),
                options || {},
                vm
            );
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

    function Vue(options) {
        if (!(this instanceof Vue)) {
            console.error('Vue is a constructor and should be called with the `new` keyword');
        }
        this._init(options);
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
