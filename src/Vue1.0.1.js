(function(global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
		//requirejs  seajs   define(function(){})
		typeof define === 'function' && define.amd ? define(factory) :
		(global.Vue = factory()); //window.Vue
})(this, function() {
	var ASSET_TYPES = [
		'component',
		'directive',
		'filter'
	];


	var hasOwnProperty = Object.prototype.hasOwnProperty;

	function hasOwn(obj, key) {
		return hasOwnProperty.call(obj, key); //检测obj对象上是否有key的属性
	}
	//全局配置对象   
	var config = {
		optionMergeStrategies: Object.create(null)
	};

	//自定义策略对象
	var strats = config.optionMergeStrategies; //config.optionMergeStrategies.count
	//策略函数    监控
	strats.el = function(parent, child, vm, key) {
		if (!vm) {
			console.error(
				"option \"" + key + "\" can only be used during instance " +
				'creation with the `new` keyword.'
			);
		}
		return defaultStrat(parent, child)
	}

	strats.data = function() {
		return function mergedInstanceDataFn() {}
	}

	//默认策略函数
	var defaultStrat = function(parentVal, childVal) {
		return childVal === undefined ?
			parentVal :
			childVal
	};

	//parent  Vue.options    child  配置对象    vm 实例对象 (在处理组件选项时为undefined)
	function mergeOptions(parent, child, vm) {
		var options = {};
		var key;
		for (key in parent) {
			mergeField(key);
		}

		for (key in child) {
			if (!hasOwn(parent, key)) {
				mergeField(key);
			}
		}
		//自定义策略的处理函数
		/*
		strats       自定义策略对象  存储策略函数
		defaultStrat 默认策略对象
		*/
		function mergeField(key) { //data
			var strat = strats[key] || defaultStrat;
			//Vue.options.count   配置对象.count
			options[key] = strat(parent[key], child[key], vm, key); //options.data = 
		}
		return options;
	}

	function resolveConstructorOptions(Ctor) { //Vue
		var options = Ctor.options;
		return options
	}

	function initMixin() {
		Vue.prototype._init = function(options) {
			var vm = this;
			vm.$options = mergeOptions(
				resolveConstructorOptions(vm.constructor), //Vue
				options || {},
				vm
			);
		}
	}

	function initGlobalAPI(Vue) {
		// config
		var configDef = {};
		configDef.get = function() {
			return config;
		};
		configDef.set = function() {
			console.error(
				'Do not replace the Vue.config object, set individual fields instead.'
			);

		}
		Object.defineProperty(Vue, 'config', configDef);
	}

	function Vue(options) {
		if (!(this instanceof Vue)) {
			console.error('Vue is a constructor and should be called with the `new` keyword');
		}
		this._init(options); //Vue.prototype._init
	}


	Vue.options = Object.create(null);
	ASSET_TYPES.forEach(function(type) {
		Vue.options[type + 's'] = Object.create(null); //{components:{}...}
	});

	initMixin(Vue);
	initGlobalAPI(Vue);
	return Vue;
});
