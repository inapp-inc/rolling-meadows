/* global RM */
(function () {
	'use strict';

	var RM = window.RM = window.RM || {};

	var LEGACY_SUPERVISOR_ROLES = ['program_supervisor', 'department_admin', 'system_admin'];

	var ROLE_LABELS = {
		case_manager: 'Case Manager',
		supervisor: 'Supervisor / Dept Admin',
		cross_program_liaison: 'Cross-Program Liaison',
		auditor: 'Auditor'
	};

	var ROLE_INITIALS = {
		case_manager: 'CM',
		supervisor: 'SD',
		cross_program_liaison: 'CL',
		auditor: 'AU'
	};

	var NAV_ITEMS = [
		{ id: 'dashboard', label: 'At a glance', href: 'dashboard.html', roles: ['case_manager', 'supervisor'] },
		{ id: 'clients', label: 'Client Search', href: 'client-search.html', roles: ['case_manager', 'supervisor'] },
		{ id: 'referrals', label: 'New Referrals', href: 'referral-intake.html', roles: ['case_manager', 'supervisor'] },
		{ id: 'reports', label: 'Reports', href: 'reports.html', roles: ['case_manager', 'supervisor', 'auditor'] },
		{ id: 'admin', label: 'Detect Duplicates', href: 'admin-duplicates.html', roles: ['supervisor'] }
	];

	var PERMISSIONS = {
		case_manager: {
			viewCaseDetail: true,
			voidOwn: true,
			bulkEnroll: true,
			resetDemo: false,
			viewCrossProgramFlag: true
		},
		supervisor: {
			viewCaseDetail: true,
			voidOwn: true,
			voidAny: true,
			bulkEnroll: true,
			resetDemo: true,
			mergeDuplicates: true,
			viewCrossProgramFlag: true
		},
		cross_program_liaison: {
			viewCaseDetail: false,
			viewCrossProgramFlag: true,
			resetDemo: false
		},
		auditor: {
			viewCaseDetail: false,
			viewAggregateReports: true,
			readOnly: true,
			viewCrossProgramFlag: false,
			resetDemo: false
		}
	};

	function normalizeRole(role) {
		if (LEGACY_SUPERVISOR_ROLES.indexOf(role) !== -1) {
			return 'supervisor';
		}
		return role;
	}

	RM.Permissions = {
		normalizeRole: normalizeRole,

		formatRoleLabel: function (role) {
			return ROLE_LABELS[normalizeRole(role)] || (role || '').replace(/_/g, ' ');
		},

		roleInitials: function (role) {
			return ROLE_INITIALS[normalizeRole(role)] || 'U';
		},

		getNavItems: function () {
			var user = RM.Session.getCurrentUser();
			if (!user) {
				return [];
			}
			var role = normalizeRole(user.role);
			if (role === 'cross_program_liaison') {
				return [{ id: 'liaison', label: 'Cross-Program Lookup', href: 'liaison-lookup.html', roles: ['cross_program_liaison'] }];
			}
			if (role === 'auditor') {
				return [{ id: 'reports', label: 'Program Audit Reports', href: 'reports.html', roles: ['auditor'] }];
			}
			return NAV_ITEMS.filter(function (item) {
				return item.roles.indexOf(role) !== -1;
			});
		},

		can: function (action) {
			var user = RM.Session.getCurrentUser();
			if (!user) {
				return false;
			}
			var perms = PERMISSIONS[normalizeRole(user.role)] || {};
			return !!perms[action];
		},

		isReadOnly: function () {
			var user = RM.Session.getCurrentUser();
			return user && normalizeRole(user.role) === 'auditor';
		},

		canViewCaseDetail: function () {
			return this.can('viewCaseDetail');
		},

		isLiaison: function () {
			var user = RM.Session.getCurrentUser();
			return user && normalizeRole(user.role) === 'cross_program_liaison';
		},

		isAuditor: function () {
			var user = RM.Session.getCurrentUser();
			return user && normalizeRole(user.role) === 'auditor';
		}
	};
})();
