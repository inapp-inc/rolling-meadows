/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('caseNote');

	RM.CaseNoteRepository = Object.assign({}, base, {
		findByClientId: function (clientId) {
			return this.findAll().filter(function (n) {
				return n.clientId === clientId && !n.voided;
			}).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
		},

		void: function (id, reason, actorId) {
			var item = this.findById(id);
			if (!item || item.voided) { return null; }
			item.voided = true;
			item.voidReason = reason;
			item.voidedBy = actorId;
			this.save(item);
			RM.Audit.record('caseNote:' + id, 'void', reason);
			return item;
		}
	});
})();
