/* global RM */
(function () {
	'use strict';

	var CADENCE = {
		High: { days: 7, label: 'Weekly' },
		Medium: { days: 30, label: 'Monthly' },
		Moderate: { days: 30, label: 'Monthly' },
		Low: { days: 90, label: 'Quarterly' }
	};

	RM.FollowUpCadenceService = {
		getCadence: function (riskLevel) {
			return CADENCE[riskLevel] || CADENCE.Medium;
		},

		getDueFollowUps: function (caseManagerId) {
			var clients = caseManagerId
				? RM.ClientRepository.findByCaseManager(caseManagerId)
				: RM.ClientRepository.findAll().filter(function (c) { return c.status !== 'closed'; });

			var due = [];
			var now = new Date();

			clients.forEach(function (client) {
				var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
				if (!assessment) { return; }
				var cadence = this.getCadence(assessment.overallRisk);
				var notes = RM.CaseNoteRepository.findByClientId(client.id);
				var lastNote = notes[0];
				var lastDate = lastNote ? new Date(lastNote.date) : new Date(client.createdAt || assessment.date);
				var daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

				if (daysSince >= cadence.days) {
					due.push({
						client: client,
						daysOverdue: daysSince - cadence.days,
						cadence: cadence.label,
						riskLevel: assessment.overallRisk
					});
				}
			}, this);

			return due.sort(function (a, b) { return b.daysOverdue - a.daysOverdue; });
		},

		getOverdueCount: function (caseManagerId) {
			return this.getDueFollowUps(caseManagerId).length;
		}
	};
})();
