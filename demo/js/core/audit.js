/* global RM */
(function () {
	'use strict';

	var RM = window.RM = window.RM || {};

	RM.Audit = {
		record: function (entityRef, action, reason) {
			var user = RM.Session.getCurrentUser();
			var entry = {
				id: 'aud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
				entityRef: entityRef,
				action: action,
				actorId: user ? user.id : 'system',
				actorName: user ? RM.Permissions.formatRoleLabel(user.role) : 'System',
				timestamp: new Date().toISOString(),
				reason: reason || null
			};
			var list = RM.Store.get('audit:log') || [];
			list.push(entry);
			RM.Store.set('audit:log', list);
			return entry;
		},

		findByEntity: function (entityRef) {
			var list = RM.Store.get('audit:log') || [];
			return list.filter(function (e) { return e.entityRef === entityRef; });
		},

		findAll: function () {
			return RM.Store.get('audit:log') || [];
		}
	};
})();
