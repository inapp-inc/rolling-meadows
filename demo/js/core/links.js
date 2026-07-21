/* global RM */
(function () {
	'use strict';

	var ROUTE_ALIASES = {
		'dashboard.html': 'dashboard',
		'client-search.html': 'client-search',
		'referral-intake.html': 'referral-intake',
		'case-workspace.html': 'case-workspace',
		'client-profile.html': 'client-profile',
		'reports.html': 'reports',
		'admin-duplicates.html': 'admin-duplicates',
		'liaison-lookup.html': 'liaison-lookup'
	};

	function normalizeRoute(route) {
		if (!route) { return 'dashboard'; }
		return ROUTE_ALIASES[route] || route.replace(/\.html$/, '');
	}

	RM.Links = {
		page: function (route, params) {
			params = params || {};
			var file = normalizeRoute(route) + '.html';
			var pairs = Object.keys(params).filter(function (key) {
				return params[key] != null && params[key] !== '';
			}).map(function (key) {
				return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
			});
			return file + (pairs.length ? '?' + pairs.join('&') : '');
		},

		go: function (route, params) {
			window.location.href = this.page(route, params);
		}
	};
})();
