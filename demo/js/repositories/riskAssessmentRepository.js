/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('riskAssessment');

	RM.RiskAssessmentRepository = Object.assign({}, base, {
		findByClientId: function (clientId) {
			return this.findAll().filter(function (r) { return r.clientId === clientId; })
				.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
		},

		findLatest: function (clientId) {
			var list = this.findByClientId(clientId);
			return list.length ? list[0] : null;
		},

		upsertLatest: function (clientId, payload) {
			var latest = this.findLatest(clientId);
			var today = new Date().toISOString().slice(0, 10);
			if (latest && latest.date === today) {
				return this.update(latest.id, Object.assign({}, payload, { clientId: clientId }));
			}
			return this.save(Object.assign({ clientId: clientId, date: today }, payload));
		}
	});
})();
