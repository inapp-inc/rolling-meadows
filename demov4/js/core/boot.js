/* global RM */
(function () {
	'use strict';

	RM.Boot = {
		init: function (options) {
			options = options || {};

			if (options.requireAuth !== false && !RM.Session.isAuthenticated()) {
				if (RM.Navigate) {
					RM.Navigate.toSignIn();
				} else {
					window.location.href = 'index.src.html';
				}
				return;
			}

			document.documentElement.classList.remove('auth-pending');
			RM.Seed.ensureLoaded();

			if (options.activeNav) {
				var moduleId = options.activeModule || (RM.Modules ? RM.Modules.resolveModule(options.activeNav) : null);
				RM.Shell.render(options.activeNav, moduleId);
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
