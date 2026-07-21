/* global RM */
(function () {
	'use strict';

	if (!window.RM || !RM.Session || !RM.Session.isAuthenticated()) {
		window.location.replace('index.html');
		return;
	}

	document.documentElement.classList.remove('auth-pending');
})();
