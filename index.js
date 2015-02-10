var parseurl = require("parseurl");
var resolve  = require("path").resolve;
var send     = require("send");
var url      = require("url");
var LFS      = require("lfs");

exports = module.exports = function (paths, options) {
	options = extend({}, options);

	var redirect = (options.redirect !== false);
	var lfs      = new LFS({ layer: true, layers: paths });

	options.maxage = (options.maxage || options.maxAge || 0);

	return function staticMiddleware(req, res, next) {
		if ([ "GET", "HEAD" ].indexOf(req.method) == -1) return next();

		var path        = parseurl(req).pathname;
		var originalUrl = url.parse(req.originalUrl || req.url);

		if (path == "/" && originalUrl.pathname[originalUrl.pathname.length - 1] != "/") {
			return directory();
		}

		function directory() {
			if (!redirect) return next();

			var target;

			originalUrl.pathname += "/";

			target = url.format(originalUrl);

			res.writeHead(303, "See Other", {
				"Location": target
			});
			return res.end("Redirecting to " + escape(target));
		}

		function error(err) {
			if (err.status == 404) return next();

			return next(err);
		}

		lfs.get(path, function (root) {
			if (root === null) {
				res.status(404).end();
			}

			var el = send(req, path, {
				maxage : options.maxage,
				root   : root
			})
			.on("error", error)
			.on("directory", directory);

			if (typeof options.pipe == "function") {
				options.pipe(el, res);
			} else {
				el.pipe(res);
			}
		});
	};
};

function escape(html) {
	return String(html)
		.replace(/&(?!\w+;)/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function extend(obj, source) {
	if (!source) return obj;

	for (var prop in source) {
		obj[prop] = source[prop];
	}

	return obj;
}
