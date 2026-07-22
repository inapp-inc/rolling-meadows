/* global RM */
(function () {
	'use strict';

	var GLOBAL_NAV = [
		{
			id: 'dashboard',
			label: 'At a Glance',
			href: 'dashboard.html',
			roles: ['case_manager', 'supervisor'],
			global: true
		}
	];

	var MODULES = [
		{
			id: 'cases',
			label: 'Cases',
			shortLabel: 'Cases',
			roles: ['case_manager', 'supervisor']
		},
		{
			id: 'clients',
			label: 'Client Management',
			shortLabel: 'Clients',
			roles: ['case_manager', 'supervisor', 'cross_program_liaison']
		},
		{
			id: 'documents',
			label: 'Document Management',
			shortLabel: 'Documents',
			roles: ['case_manager', 'supervisor']
		},
		{
			id: 'workflow',
			label: 'Workflow Management',
			shortLabel: 'Workflow',
			roles: ['case_manager', 'supervisor']
		},
		{
			id: 'services',
			label: 'Services',
			shortLabel: 'Services',
			roles: ['case_manager', 'supervisor']
		},
		{
			id: 'analytics',
			label: 'Analytics',
			shortLabel: 'Analytics',
			roles: ['case_manager', 'supervisor', 'auditor']
		}
	];

	var NAV_BY_MODULE = {
		cases: [
			{ id: 'case-search', label: 'Case Search', href: 'case-search.html', roles: ['case_manager', 'supervisor'] },
			{ id: 'case-creation', label: 'Case Creation', href: 'case-creation.html', roles: ['case_manager', 'supervisor'] }
		],
		clients: [
			{ id: 'client-search', label: 'Client Search', href: 'client-search.html', roles: ['case_manager', 'supervisor'] },
			{ id: 'admin-duplicates', label: 'Duplicate Detection', href: 'admin-duplicates.html', roles: ['supervisor'] },
			{ id: 'liaison-lookup', label: 'Cross-Program Lookup', href: 'liaison-lookup.html', roles: ['cross_program_liaison'] }
		],
		documents: [
			{ id: 'documents-hub', label: 'Document Vault', href: 'documents-hub.html', roles: ['case_manager', 'supervisor'] }
		],
		workflow: [
			{ id: 'workflow-hub', label: 'Task & Handoff Board', href: 'workflow-hub.html', roles: ['case_manager', 'supervisor'] }
		],
		services: [
			{ id: 'services-hub', label: 'Service Coordination', href: 'services-hub.html', roles: ['case_manager', 'supervisor'] },
			{ id: 'bulk-enroll', label: 'Bulk Service Allocation', href: 'bulk-enrollment.html', roles: ['case_manager', 'supervisor'] }
		],
		analytics: [
			{ id: 'reports', label: 'Reports & Dashboards', href: 'reports.html', roles: ['case_manager', 'supervisor'] },
			{ id: 'audit-reports', label: 'Program Audit Reports', href: 'reports.html', roles: ['auditor'] }
		]
	};

	var NAV_TO_MODULE = {
		'referral-intake': 'cases',
		'case-search': 'cases',
		'case-creation': 'cases',
		'case-workspace': 'cases',
		'client-profile': 'cases',
		'client-search': 'clients',
		'admin-duplicates': 'clients',
		'liaison-lookup': 'clients',
		'documents-hub': 'documents',
		'workflow-hub': 'workflow',
		dashboard: null,
		'services-hub': 'services',
		'bulk-enroll': 'services',
		reports: 'analytics',
		'audit-reports': 'analytics'
	};

	var NAV_ITEMS_FLAT = {};

	GLOBAL_NAV.forEach(function (item) {
		NAV_ITEMS_FLAT[item.id] = Object.assign({}, item);
	});

	Object.keys(NAV_BY_MODULE).forEach(function (moduleId) {
		NAV_BY_MODULE[moduleId].forEach(function (item) {
			NAV_ITEMS_FLAT[item.id] = Object.assign({ moduleId: moduleId }, item);
		});
	});

	NAV_ITEMS_FLAT['referral-intake'] = {
		id: 'referral-intake',
		label: 'Referral & Intake',
		href: 'referral-intake.html',
		moduleId: 'cases',
		roles: ['case_manager', 'supervisor'],
		hidden: true
	};

	function normalizeRole(role) {
		return RM.Permissions.normalizeRole(role);
	}

	function modulesForRole(role) {
		role = normalizeRole(role);
		if (role === 'cross_program_liaison') {
			return MODULES.filter(function (m) { return m.id === 'clients'; });
		}
		if (role === 'auditor') {
			return MODULES.filter(function (m) { return m.id === 'analytics'; });
		}
		return MODULES.filter(function (m) {
			return m.roles.indexOf(role) !== -1;
		});
	}

	function navItemsForModule(moduleId, role) {
		role = normalizeRole(role);
		var items = NAV_BY_MODULE[moduleId] || [];

		return items.filter(function (item) {
			return item.roles.indexOf(role) !== -1;
		});
	}

	function globalNavForRole(role) {
		role = normalizeRole(role);
		return GLOBAL_NAV.filter(function (item) {
			return item.roles.indexOf(role) !== -1;
		});
	}

	function resolveNavHref(item) {
		return item.href;
	}

	RM.Modules = {
		list: MODULES,

		resolveModule: function (navId) {
			if (Object.prototype.hasOwnProperty.call(NAV_TO_MODULE, navId)) {
				return NAV_TO_MODULE[navId];
			}
			return 'cases';
		},

		globalNavForUser: function (user) {
			if (!user) { return []; }
			return globalNavForRole(user.role);
		},

		navItem: function (navId) {
			return NAV_ITEMS_FLAT[navId] || null;
		},

		pageTitleForNav: function (navId) {
			var item = NAV_ITEMS_FLAT[navId];
			return item ? item.label : '';
		},

		modulesForUser: function (user) {
			if (!user) { return []; }
			return modulesForRole(user.role);
		},

		navItemsForModule: function (moduleId, user) {
			if (!user) { return []; }
			return navItemsForModule(moduleId, user.role);
		},

		resolveNavHref: resolveNavHref,

		defaultModuleForUser: function (user) {
			var modules = this.modulesForUser(user);
			if (!modules.length) { return 'cases'; }
			var preferred = modules.find(function (m) { return m.id === 'cases'; });
			return preferred ? preferred.id : modules[0].id;
		},

		labelForModule: function (moduleId) {
			var mod = MODULES.find(function (m) { return m.id === moduleId; });
			return mod ? mod.label : moduleId;
		}
	};
})();
