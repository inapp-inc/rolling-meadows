/* global RM */
(function () {
	'use strict';

	RM.Boot = {
		init: function (options) {
			options = options || {};

			if (options.requireAuth !== false && !RM.Session.isAuthenticated()) {
				window.location.replace('index.html');
				return;
			}

			document.documentElement.classList.remove('auth-pending');
			RM.Seed.ensureLoaded();

			if (options.activeNav) {
				RM.Shell.render(options.activeNav);
			}

			if (options.onReady && typeof options.onReady === 'function') {
				options.onReady();
			}

			if (options.stepperPage) {
				RM.Stepper.render('workflow-stepper', options.stepperPage);
			}
		}
	};
})();
