/* global RM */
(function () {
	'use strict';

	RM.ReportEngine = {
		EVENTS: [
			{ id: 'evt-meals', name: 'Meals on Wheels Program' },
			{ id: 'evt-holiday', name: 'Holiday Meal Program' },
			{ id: 'evt-safety', name: 'Home Safety Workshop' }
		],

		caseloadByRisk: function () {
			var clients = RM.ClientRepository.findAll().filter(function (c) {
				return c.status !== 'closed';
			});
			var counts = { High: 0, Medium: 0, Moderate: 0, Low: 0, Unknown: 0 };

			clients.forEach(function (client) {
				var a = RM.RiskAssessmentRepository.findLatest(client.id);
				var level = a ? a.overallRisk : 'Unknown';
				counts[level] = (counts[level] || 0) + 1;
			});

			return Object.keys(counts).map(function (level) {
				return { riskLevel: level, count: counts[level] };
			}).filter(function (r) { return r.count > 0; });
		},

		enrolledInEvent: function (eventId) {
			var enrollments = RM.ServiceEnrollmentRepository.findByEventId(eventId);
			return enrollments.map(function (e) {
				var client = RM.ClientRepository.findById(e.clientId);
				return {
					clientId: e.clientId,
					clientName: client ? client.name : 'Unknown',
					dateEnrolled: e.dateEnrolled,
					eventId: eventId,
					eventName: (RM.ReportEngine.EVENTS.find(function (ev) { return ev.id === eventId; }) || {}).name || eventId
				};
			});
		},

		overdueFollowUps: function (caseManagerId) {
			return RM.FollowUpCadenceService.getDueFollowUps(caseManagerId).map(function (d) {
				return {
					clientId: d.client.id,
					clientName: d.client.name,
					daysOverdue: d.daysOverdue,
					cadence: d.cadence,
					riskLevel: d.riskLevel
				};
			});
		},

		openCBOReferrals: function () {
			return RM.CBOReferralRepository.findAll().filter(function (r) {
				return r.status === 'Pending' || r.status === 'Sent';
			}).map(function (r) {
				var client = RM.ClientRepository.findById(r.clientId);
				return {
					clientId: r.clientId,
					clientName: client ? client.name : 'Unknown',
					cboName: r.cboName,
					status: r.status,
					date: r.date
				};
			});
		},

		programSnapshot: function () {
			var clients = RM.Data.activeClients();
			var riskGroups = RM.Data.groupByRisk(clients);
			return {
				totalActive: clients.length,
				highRisk: (riskGroups.High || []).length,
				incompleteIntakes: clients.filter(function (c) { return c.incompleteIntake; }).length,
				openCboReferrals: this.openCBOReferrals().length,
				overdueFollowUps: RM.FollowUpCadenceService.getDueFollowUps(null).length
			};
		},

		enrollmentCountForEvent: function (eventId) {
			var event = this.EVENTS.find(function (ev) { return ev.id === eventId; });
			return {
				eventId: eventId,
				eventName: event ? event.name : eventId,
				count: RM.ServiceEnrollmentRepository.findByEventId(eventId).length
			};
		},

		overdueSummary: function () {
			var rows = this.overdueFollowUps(null);
			var byRisk = {};
			var byCadence = {};
			rows.forEach(function (row) {
				byRisk[row.riskLevel] = (byRisk[row.riskLevel] || 0) + 1;
				byCadence[row.cadence] = (byCadence[row.cadence] || 0) + 1;
			});
			return { total: rows.length, byRisk: byRisk, byCadence: byCadence };
		},

		cboReferralSummary: function () {
			var rows = this.openCBOReferrals();
			var byStatus = {};
			var byCbo = {};
			rows.forEach(function (row) {
				byStatus[row.status] = (byStatus[row.status] || 0) + 1;
				byCbo[row.cboName] = (byCbo[row.cboName] || 0) + 1;
			});
			return { total: rows.length, byStatus: byStatus, byCbo: byCbo };
		},

		caseloadSuccessMetrics: function (caseload, overdueCount) {
			var clientIds = {};
			caseload.forEach(function (c) { clientIds[c.id] = true; });
			var total = caseload.length;
			var riskOrder = { Low: 1, Medium: 2, Moderate: 2, High: 3 };

			var enrollments = RM.ServiceEnrollmentRepository.findAll().filter(function (e) {
				return !e.voided && clientIds[e.clientId];
			});
			var clientsWithServices = {};
			enrollments.forEach(function (e) { clientsWithServices[e.clientId] = true; });

			var activeGoals = RM.CarePlanRepository.findAll().filter(function (cp) {
				if (cp.voided || !clientIds[cp.clientId]) { return false; }
				return cp.status === 'In Progress' || /^complete/i.test(cp.status || '');
			});

			var completeIntakes = caseload.filter(function (c) { return !c.incompleteIntake; }).length;
			var overdue = typeof overdueCount === 'number' ? overdueCount : 0;
			var followUpOnTrackPct = total ? Math.round(((total - Math.min(overdue, total)) / total) * 100) : 100;
			var servicesPct = total ? Math.round((Object.keys(clientsWithServices).length / total) * 100) : 0;

			var riskImprovements = 0;
			caseload.forEach(function (c) {
				RM.ReassessmentRepository.findByClientId(c.id).forEach(function (r) {
					if (!r.previousRatings || !r.newRatings) { return; }
					var improved = false;
					Object.keys(r.newRatings).forEach(function (key) {
						var prev = riskOrder[r.previousRatings[key]] || 0;
						var curr = riskOrder[r.newRatings[key]] || 0;
						if (curr && prev && curr < prev) { improved = true; }
					});
					if (improved) { riskImprovements += 1; }
				});
			});

			var cboConfirmed = RM.CBOReferralRepository.findAll().filter(function (r) {
				return clientIds[r.clientId] && r.status === 'Confirmed';
			}).length;

			return {
				total: total,
				serviceEnrollments: enrollments.length,
				clientsWithServices: Object.keys(clientsWithServices).length,
				activeGoals: activeGoals.length,
				completeIntakes: completeIntakes,
				intakeCompletePct: total ? Math.round((completeIntakes / total) * 100) : 0,
				followUpOnTrackPct: followUpOnTrackPct,
				servicesConnectedPct: servicesPct,
				riskImprovements: riskImprovements,
				cboConfirmed: cboConfirmed
			};
		}
	};
})();
