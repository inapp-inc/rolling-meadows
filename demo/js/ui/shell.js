/* global RM */
(function () {
	'use strict';

	var NAV_ICONS = {
		dashboard: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
		clients: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
		liaison: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
		referrals: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
		reports: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
		admin: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>'
	};

	function userDisplayLabel(user) {
		return RM.Permissions.formatRoleLabel(user.role);
	}

	RM.Shell = {
		render: function (activeNavId) {
			var shell = document.getElementById('app-shell');
			if (!shell) { return; }

			var user = RM.Session.getCurrentUser();
			var navItems = RM.Permissions.getNavItems();

			var navHtml = navItems.map(function (item) {
				var isActive = activeNavId === item.id;
				var icon = NAV_ICONS[item.id] || NAV_ICONS.dashboard;
				return '<li class="' + (isActive ? 'active' : '') + '">' +
					'<a href="' + item.href + '">' + icon +
					'<span>' + RM.Components.escapeHtml(item.label) + '</span></a></li>';
			}).join('');

			var resetBtn = RM.Permissions.can('resetDemo')
				? '<button type="button" id="btn-reset-demo" class="btn btn-sm btn-ghost">Reset Demo</button>'
				: '';

			shell.innerHTML =
				'<header class="top-bar">' +
				'<div class="top-bar-left">' +
				'<div class="rm-logo-wrap">' +
				'<img src="assets/rmeadows-logo.png" alt="City of Rolling Meadows" class="rm-logo">' +
				'</div>' +
				'<div class="brand-text">' +
				'<span class="app-title">Human Services Department</span>' +
				'</div></div>' +
				'<div class="top-bar-center">' +
				'<span class="program-badge">' +
				(RM.Permissions.isLiaison() ?
					'Police Social Services · Cross-Program Liaison' :
					RM.Permissions.isAuditor() ?
						'Program Audit · De-identified metrics' :
						'Senior Social Services · Seniors-at-Risk') +
				'</span>' +
				'</div>' +
				'<div class="top-bar-right">' +
				'<div class="demo-by-inapp" title="Demonstration mockup built by InApp">' +
				'<span class="demo-by-label">Demo by</span>' +
				'<img src="assets/inapp-logo.webp" alt="InApp" class="inapp-logo">' +
				'</div>' +
				'<button type="button" class="notification-bell" title="Alerts (demo)" aria-label="Notifications">' +
				RM.Components.icon('bell') + '</button>' +
				(user ? '<div class="user-badge">' +
					'<span class="user-avatar" aria-hidden="true">' + RM.Permissions.roleInitials(user.role) + '</span>' +
					'<span class="user-info">' +
					'<span class="user-name">' + RM.Components.escapeHtml(userDisplayLabel(user)) + '</span>' +
					'<span class="user-role">Demo session</span>' +
					'</span></div>' : '') +
				resetBtn +
				'<button type="button" id="btn-sign-out" class="btn btn-sm btn-ghost">Sign out</button>' +
				'</div></header>' +
				'<div class="app-body">' +
				'<nav class="left-nav" aria-label="Main navigation">' +
				'<div class="nav-section-label">Navigation</div>' +
				'<ul>' + navHtml + '</ul>' +
				'<div class="nav-footer">Demo mockup · Session data only<br>© City of Rolling Meadows</div>' +
				'</nav>' +
				'<div class="main-wrapper"></div></div>';

			var main = document.getElementById('page-content');
			var wrapper = shell.querySelector('.main-wrapper');
			if (main && wrapper && !wrapper.contains(main)) {
				wrapper.appendChild(main);
			}

			document.getElementById('btn-sign-out').addEventListener('click', function () {
				RM.Session.signOut();
			});
			var reset = document.getElementById('btn-reset-demo');
			if (reset) {
				reset.addEventListener('click', function () {
					if (window.confirm('Reset all demo data to seed state?')) {
						RM.Session.resetDemo();
					}
				});
			}
		}
	};
})();
