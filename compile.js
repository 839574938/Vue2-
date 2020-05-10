(function (root) {

    var attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
    // could use https://www.w3.org/TR/1999/REC-xml-names-19990114/#NT-QName
    // but for Vue templates we can enforce a simple charset
    var ncname = '[a-zA-Z_][\\w\\-\\.]*';
    var qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";
    var startTagOpen = new RegExp(("^<" + qnameCapture));
    var startTagClose = /^\s*(\/?)>/;
    var endTag = new RegExp(("^<\\/" + qnameCapture + "[^>]*>"));
    var doctype = /^<!DOCTYPE [^>]+>/i;
    // #7298: escape - to avoid being pased as HTML comment when inlined in page
    var comment = /^<!\--/;
    var conditionalComment = /^<!\[/;

    var baseOptions = {}
    var noop = function () {
    }


    var no = function () {

    }

    var isPlainTextElement = makeMap('script,style,textarea', true);

    //检测是否存在这些名
    function makeMap(str, expectsLowerCase) {
        var map = Object.create(null);
        var list = str.split(',');
        for (var i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }
        return expectsLowerCase ?
            function (val) {
                return map[val.toLowerCase()];
            } :
            function (val) {
                return map[val];
            }
    }

    function extend(to, _from) {
        for (var key in _from) {
            to[key] = _from[key];
        }
        return to
    }

    //渲染函数 code
    function createFunction(code, errors) {
        try {
            return new Function(code)
        } catch (err) {
            errors.push({
                err: err,
                code: code
            });
            return noop
        }
    }

    function createCompileToFunctionFn(compile) {
        var cache = Object.create(null);

        return function compileToFunctions(template, options, vm) {
            options = extend({}, options);

            //判断是否支持new Function() 这个方法
            {
                try {
                    new Function('return 1');
                } catch (e) {
                    if (e.toString().match(/unsafe-eval|CSP/)) {
                        console.error(
                            'It seems you are using the standalone build of Vue.js in an ' +
                            'environment with Content Security Policy that prohibits unsafe-eval. ' +
                            'The template compiler cannot work in this environment. Consider ' +
                            'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
                            'templates into render functions.'
                        );
                    }
                }
            }

            var key = options.delimiters ?
                String(options.delimiters) + template :
                template;

            //缓存中有就直接返回
            if (cache[key]) {
                return cache[key]
            }

            // {ast, error, tips ,render, staticRenderFns}
            var compiled = compile(template, options);
            {
                if (compiled.errors && compiled.errors.length) {
                    console.error(
                        "Error compiling template:\n\n" + template + "\n\n" +
                        compiled.errors.map(function (e) {
                            return ("- " + e);
                        }).join('\n') + '\n',
                        vm
                    );
                }
                if (compiled.tips && compiled.tips.length) {
                    compiled.tips.forEach(function (msg) {
                        return tip(msg, vm);
                    });
                }
            }

            var res = {};
            var fnGenErrors = [];
            res.render = createFunction(compiled.render, fnGenErrors);
            res.staticRenderFns = compiled.staticRenderFns.map(function (code) {
                return createFunction(code, fnGenErrors)
            });

            {
                if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
                    console.error(
                        "Failed to generate render function:\n\n" +
                        fnGenErrors.map(function (ref) {
                            var err = ref.err;
                            var code = ref.code;

                            return ((err.toString()) + " in\n\n" + code + "\n");
                        }).join('\n'),
                        vm
                    );
                }
            }

            return (cache[key] = res);
        }
    }


    function createCompilerCreator(baseCompile) {
        return function createCompiler(baseOptions) {
            function compile(template, options) {
                var finalOptions = Object.create(baseOptions);
                var errors = [];    //错误信息
                var tips = [];      //警告信息

                finalOptions.warn = function (msg, tip) {
                    (tip ? tips : errors).push(msg);
                };

                if (options) {
                    // merge custom modules
                    if (options.modules) {
                        finalOptions.modules =
                            (baseOptions.modules || []).concat(options.modules);
                    }
                    // merge custom directives
                    if (options.directives) {
                        finalOptions.directives = extend(
                            Object.create(baseOptions.directives || null),
                            options.directives
                        );
                    }
                    // copy other options
                    for (var key in options) {
                        if (key !== 'modules' && key !== 'directives') {
                            finalOptions[key] = options[key];
                        }
                    }
                }

                var compiled = baseCompile(template, finalOptions);
                compiled.errors = errors;
                compiled.tips = tips;

                return compiled;
            }

            return {
                compileToFunctions: createCompileToFunctionFn(compile)
            }
        }
    }


    var createCompiler = createCompilerCreator(function baseCompile(template, options) {
        var ast = parse(template.trim(), options);
        // if (options.optimize !== false) {
        //     optimize(ast, options);
        // }
        // var code = generate(ast, options);
        return {
            ast: {},
            render: "",
            staticRenderFns: []
        }

    });

    function parse(template, options) {
        parseHtml(template, {
            start: function start(tag, attrs, unary) {
                //开始标签的钩子函数
            },
            end: function end() {

            },
            chars: function chars() {
                //解析文本的钩子函数
            },
            comment: function comment() {

            }
        })
    }

    function parseHtml(html, options) {
        //进行template处理

        var stack = [];
        var expectHTML = options.expectHTML;
        var isUnaryTag$$1 = options.isUnaryTag || no;
        var canBeLeftOpenTag$$1 = options.canBeLeftOpenTag || no;
        var index = 0;
        var last, lastTag;

        // while (html) {
        //判断是都是结束标签
        if (!lastTag || !isPlainTextElement(lastTag)) {
            var textEnd = html.indexOf('<');

            if (textEnd === 0) {

                // End tag:
                var endTagMatch = html.match(endTag);
                if (endTagMatch) {
                    var curIndex = index;
                    advance(endTagMatch[0].length);
                    parseEndTag(endTagMatch[1], curIndex, index);
                    // continue
                }


                //start
                var startTagMatch = parseStartTag();
                if (startTagMatch) {
                    handleStartTag(startTagMatch);

                }

                var text = (void 0),
                    rest = (void 0),
                    next = (void 0);


                //大于等于0的时候则为有文本内容的时候
                if (textEnd >= 0) {
                    rest = html.slice(textEnd);
                    while (
                        !endTag.test(rest) &&
                        !startTagOpen.test(rest) &&
                        !comment.test(rest) &&
                        !conditionalComment.test(rest)
                        ) {
                        // < in plain text, be forgiving and treat it as text
                        next = rest.indexOf('<', 1);
                        if (next < 0) {
                            break
                        }
                        textEnd += next;
                        rest = html.slice(textEnd);
                    }
                    text = html.substring(0, textEnd);
                    advance(textEnd);
                }

                if (textEnd < 0) {
                    text = html;
                    html = '';
                }

                if (options.chars && text) {
                    options.chars(text);
                }
            }
        }

        // }

        function advance(n) {
            index += n;
            html = html.substring(n);
        }

        function parseEndTag(tagName, start, end) {
            var pos, lowerCasedTagName;

            // Find the closest opened tag of the same type
            if (tagName) {
                lowerCasedTagName = tagName.toLowerCase();
                //如果存在没有写闭合标签的就会存下来pos 的值比如a标签在最后5 ，检测span则会为span的length 4,pos则为4
                for (pos = stack.length - 1; pos >= 0; pos--) {
                    //检测首先匹配到的tagname 是否在stack里面存在，并存储pos的值
                    if (stack[pos].lowerCasedTag === lowerCasedTagName) {
                        break
                    }
                }
            } else {
                // If no tag name is provided, clean shop
                pos = 0;
            }

            if (pos >= 0) {
                // 他检测到length为5，pos为4 所以就判断出a标签没有写结束标签
                for (var i = stack.length - 1; i >= pos; i--) {
                    //判断pos是不是最后一个元素，不是就知道没有闭合标签就报错
                    if (i > pos || !tagName &&
                        options.warn
                    ) {
                        options.warn(
                            ("tag <" + (stack[i].tag) + "> has no matching end tag.")
                        );
                    }
                    if (options.end) {
                        //执行end
                        options.end(stack[i].tag, start, end);
                    }
                }

                // 移除stack中的最后一个
                stack.length = pos;
                //重新复制
                lastTag = pos && stack[pos - 1].tag;
            } else if (lowerCasedTagName === 'br') {
                //没有写开始标签的为br
                if (options.start) {
                    options.start(tagName, [], true, start, end);
                }
            } else if (lowerCasedTagName === 'p') {
                //没有写开始标签的为p
                if (options.start) {
                    //调用start,传过去一个什么都没有的p
                    options.start(tagName, [], false, start, end);
                }
                if (options.end) {
                    options.end(tagName, start, end);
                }
            }
        }



        //检索一个html <div id='app' 。。。>检索一段标签到结束 返回match
        function parseStartTag() {
            var start = html.match(startTagOpen);
            if (start) {
                var match = {
                    tagName: start[1],
                    attrs: [],
                    start: index
                };
                advance(start[0].length);
                var end, attr;
                while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
                    advance(attr[0].length);
                    match.attrs.push(attr);
                }
                if (end) {
                    match.unarySlash = end[1];
                    advance(end[0].length);
                    match.end = index;
                    return match
                }
            }
        }


        function handleStartTag(match) {
            var tagName = match.tagName;
            var unarySlash = match.unarySlash;


            var unary = isUnaryTag$$1(tagName) || !!unarySlash;
            var l = match.attrs.length;
            var attrs = new Array(l);

            //目的是为了把乱乱的数据格式变为name： value格式的
            for (var i = 0; i < l; i++) {
                var args = match.attrs[i];
                var value = args[3] || args[4] || args[5] || '';
                var shouldDecodeNewlines = tagName === 'a' && args[1] === 'href' ?
                    options.shouldDecodeNewlinesForHref :
                    options.shouldDecodeNewlines;
                attrs[i] = {
                    name: args[1],
                    value: value
                };
            }

            //是否是一元标签
            if (!unary) {
                stack.push({
                    tag: tagName,
                    lowerCasedTag: tagName.toLowerCase(),
                    attrs: attrs
                });
                lastTag = tagName;
            }

            if (options.start) {
                //调用options.start
                options.start(tagName, attrs, unary, match.start, match.end);
            }
        }
    }


    var ref$1 = createCompiler(baseOptions);
    var compile = ref$1.compile;
    var compileToFunctions = ref$1.compileToFunctions;

    root.compile = compileToFunctions;
})(this);


/*
*   1. compileToFunctions 定义在 ref$1.compileToFunctions这上面
*       ref$1 = createCompiler(baseOptions)
*       顾名思义createCompiler返回的是一个对象{}有compileToFunctions属性的方法
*
*   2. createCompiler的方法是createCompilerCreator返回值所以
*       createCompilerCreator 返回 createCompiler 返回  compileToFunctions
*
*   3. compileToFunctions 方法是 createCompileToFunctionFn方法的返回值
*       所以调用compile默认调用 createCompileToFunctionFn 方法的返回值
* */

