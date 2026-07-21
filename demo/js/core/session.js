/* global RM */
(function () {
	'use strict';

	var RM = window.RM = window.RM || {};

	RM.Session = {
		getCurrentUser: function () {
			return RM.Store.getMeta('session');
		},

		setCurrentUser: function (user) {
			RM.Store.setMeta('session', user);
		},

		getActiveClientId: function () {
			return RM.Store.getMeta('activeClientId');
		},

		setActiveClientId: function (id) {
			RM.Store.setMeta('activeClientId', id);
		},

		signOut: function () {
			RM.Store.setMeta('session', null);
			RM.Store.setMeta('activeClientId', null);
			window.location.replace('index.html');
		},

		isAuthenticated: function () {
			return !!this.getCurrentUser();
		},

		resetDemo: function () {
			if (!RM.Permissions.can('resetDemo')) {
				return false;
			}
			RM.Store.clearAll();
			RM.Seed.load();
			window.location.href = 'dashboard.html';
			return true;
		}
	};
})();
