(function () {
	'use strict';

	if (!window.RM || !RM.Session || !RM.Session.isAuthenticated()) {
		location.replace('index.html');
		return;
	}

	var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
	var routes = {
		'dashboard.html': 'dashboard',
		'client-search.html': 'client-search',
		'referral-intake.html': 'referral-intake',
		'case-workspace.html': 'case-workspace',
		'client-profile.html': 'client-profile',
		'reports.html': 'reports',
		'admin-duplicates.html': 'admin-duplicates',
		'liaison-lookup.html': 'liaison-lookup',
		'liaison.html': 'liaison-lookup'
	};
	var workspaceTabs = {
		'risk-assessment.html': 'assessment',
		'care-plan.html': 'careplan',
		'service-coordination.html': 'services',
		'monitoring.html': 'followup',
		'reassessment.html': 'reassessment',
		'case-closure.html': 'closure'
	};

	var route = routes[file] || (workspaceTabs[file] ? 'case-workspace' : file.replace(/\.html$/, ''));
	var params = new URLSearchParams(location.search);

	if (workspaceTabs[file]) {
		params.set('tab', workspaceTabs[file]);
	}

	var qs = params.toString();
	location.replace(route + '.html' + (qs ? '?' + qs : ''));
})();
