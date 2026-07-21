/* global RM */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		RM.Seed.ensureLoaded();

		var select = document.getElementById('role-select');
		RM.Seed.ROLE_OPTIONS.forEach(function (opt) {
			var el = document.createElement('option');
			el.value = opt.userId;
			el.textContent = opt.label;
			select.appendChild(el);
		});

		document.getElementById('sign-in-form').addEventListener('submit', function (e) {
			e.preventDefault();
			var user = RM.UserRepository.findById(select.value);
			if (user) {
				RM.Session.setCurrentUser(user);
				if (RM.Permissions.normalizeRole(user.role) === 'cross_program_liaison') {
					window.location.href = 'liaison-lookup.html';
				} else if (RM.Permissions.normalizeRole(user.role) === 'auditor') {
					window.location.href = 'reports.html';
				} else {
					window.location.href = 'dashboard.html';
				}
			}
		});
	});
})();
