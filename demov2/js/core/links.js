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
		'liaison-lookup.html': 'liaison-lookup',
		'documents-hub.html': 'documents-hub',
		'services-hub.html': 'services-hub',
		'case-creation.html': 'case-creation',
		'case-search.html': 'case-search',
		'workflow-hub.html': 'workflow-hub',
		'bulk-enrollment.html': 'bulk-enroll'
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
			var url = this.page(route, params);
			if (RM.Navigate) {
				RM.Navigate.go(url);
			} else {
				window.location.href = url;
			}
		}
	};
})();
