/* global RM */
(function () {
	'use strict';

	var CATALOG = [
		{
			id: 'clients-by-program',
			labelKey: 'pages.reports.clientsByProgram',
			reportType: 'chart',
			primaryEntity: 'case',
			joins: [],
			columns: [],
			filters: [],
			chart: {
				xAxis: { entity: 'case', field: 'programId' },
				yAxis: { aggregate: 'count' },
				chartType: 'bar'
			}
		},
		{
			id: 'multi-program-enrollment',
			labelKey: 'pages.reports.multiProgramEnrollment',
			reportType: 'chart',
			primaryEntity: 'client',
			joins: ['case'],
			columns: [],
			filters: [{ entity: 'case', field: 'status', op: 'eq', value: 'active' }],
			chart: {
				xAxis: { entity: 'case', field: 'programId' },
				yAxis: { aggregate: 'count' },
				chartType: 'bar'
			}
		},
		{
			id: 'caseload-by-risk',
			labelKey: 'pages.reports.caseloadByRisk',
			reportType: 'chart',
			primaryEntity: 'client',
			joins: ['riskAssessment'],
			columns: [],
			filters: [],
			joinAggregates: { riskAssessment: 'latest' },
			chart: {
				xAxis: { entity: 'riskAssessment', field: 'overallRisk' },
				yAxis: { aggregate: 'count' },
				chartType: 'donut'
			}
		},
		{
			id: 'event-enrollment',
			labelKey: 'pages.reports.clientsEnrolledInEvent',
			reportType: 'table',
			primaryEntity: 'serviceEnrollment',
			joins: ['client'],
			columns: [
				{ entity: 'client', field: 'name' },
				{ entity: 'serviceEnrollment', field: 'dateEnrolled' },
				{ entity: 'serviceEnrollment', field: 'serviceOrEventId' }
			],
			filters: [{ entity: 'serviceEnrollment', field: 'voided', op: 'false', value: '' }]
		},
		{
			id: 'overdue-follow-ups',
			labelKey: 'pages.reports.overdueFollowUps',
			reportType: 'table',
			primaryEntity: 'client',
			joins: ['case', 'riskAssessment'],
			columns: [
				{ entity: 'client', field: 'name' },
				{ entity: 'riskAssessment', field: 'overallRisk' },
				{ entity: 'case', field: 'status' },
				{ entity: 'case', field: 'programId' }
			],
			filters: [{ entity: 'case', field: 'status', op: 'eq', value: 'active' }],
			joinAggregates: { riskAssessment: 'latest' }
		},
		{
			id: 'open-cbo-referrals',
			labelKey: 'pages.reports.openCboReferrals',
			reportType: 'table',
			primaryEntity: 'cboReferral',
			joins: ['client'],
			columns: [
				{ entity: 'client', field: 'name' },
				{ entity: 'cboReferral', field: 'cboName' },
				{ entity: 'cboReferral', field: 'status' },
				{ entity: 'cboReferral', field: 'date' }
			],
			filters: [{ entity: 'cboReferral', field: 'status', op: 'eq', value: 'Pending' }]
		}
	];

	RM.ReportCatalog = {
		all: function () {
			return CATALOG.slice();
		},

		findById: function (id) {
			return CATALOG.find(function (item) { return item.id === id; }) || null;
		},

		builderUrl: function (catalogId) {
			return RM.Links.page('report-builder', { template: catalogId });
		}
	};
})();
