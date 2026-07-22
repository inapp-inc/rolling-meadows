/* global RM */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'services',
			activeNav: 'services-hub',
			onReady: function () {
				if (RM.Permissions.isAuditor() || RM.Permissions.isLiaison()) {
					window.location.href = RM.Links.page('dashboard');
					return;
				}
				renderPage();
			}
		});
	});

	function renderPage() {
		var user = RM.Session.getCurrentUser();
		var clients = RM.Data.caseloadForUser(user);
		var openCbo = RM.CBOReferralRepository.findAll().filter(function (r) {
			return r.status === 'Pending' || r.status === 'Sent';
		});
		var main = document.getElementById('page-content');

		main.innerHTML =
			RM.Components.modulePageHeader('services-hub') +
			'<div class="card-grid">' +
			RM.Components.statCard(clients.length, 'Active Caseload', 'users', 'primary', null) +
			RM.Components.statCard(openCbo.length, 'Open CBO Referrals', 'link', 'warning', null) +
			'</div>' +
			'<div class="card"><div class="card-header"><h2>Quick actions</h2></div>' +
			'<div class="quick-actions">' +
			'<a href="' + RM.Links.page('bulk-enroll') + '" class="btn btn-primary btn-sm">Bulk service allocation</a>' +
			'<a href="' + RM.Links.page('reports') + '" class="btn btn-secondary btn-sm">Enrollment reports</a>' +
			'</div></div>' +
			'<div class="card"><h2>Enroll or coordinate by client</h2>' +
			'<div id="services-client-list"></div></div>' +
			(openCbo.length ? '<div class="card"><h2>Open CBO Referrals</h2><div id="cbo-open-list"></div></div>' : '');

		var listEl = document.getElementById('services-client-list');
		if (!clients.length) {
			listEl.innerHTML = RM.Components.emptyState('No active cases', 'Referrals will appear here.');
		} else {
			var rows = clients.map(function (c) {
				var enr = RM.ServiceEnrollmentRepository.findByClientId(c.id).length;
				var stageStatus = RM.Workflow.getStatus(c);
				var program = RM.CaseCategories.subcategoryLabel(c.caseSubcategoryId) ||
					RM.CaseCategories.categoryLabel(c.caseCategoryId);
				return '<tr class="services-client-row" data-client-id="' + RM.Components.escapeHtml(c.id) + '">' +
					'<td class="col-client"><strong title="' + RM.Components.escapeHtml(c.name) + '">' +
					RM.Components.escapeHtml(c.name) + '</strong></td>' +
					'<td class="col-program"><span class="case-type-chip" title="' + RM.Components.escapeHtml(program) + '">' +
					RM.Components.escapeHtml(program) + '</span></td>' +
					'<td class="col-enrollments">' + enr + '</td>' +
					'<td class="col-stage"><span class="case-stage-chip" title="' + RM.Components.escapeHtml(stageStatus.label) + '">' +
					'Stage ' + stageStatus.stage + '</span></td>' +
					'<td class="col-action">' +
					'<a href="' + RM.Links.page('case-workspace', { clientId: c.id, tab: 'services' }) +
					'" class="btn btn-sm btn-secondary">Open services</a></td></tr>';
			}).join('');

			listEl.innerHTML =
				'<div class="table-responsive">' +
				'<table class="data-table services-client-table">' +
				'<thead><tr><th>Client</th><th>Program</th><th>Enrollments</th><th>Stage</th><th></th></tr></thead>' +
				'<tbody>' + rows + '</tbody></table></div>';
		}

		if (openCbo.length) {
			var cboRows = openCbo.map(function (r) {
				var client = RM.ClientRepository.findById(r.clientId);
				return '<tr>' +
					'<td class="col-client"><strong>' + RM.Components.escapeHtml(client ? client.name : 'Unknown') + '</strong></td>' +
					'<td class="col-cbo">' + RM.Components.escapeHtml(r.cboName) + '</td>' +
					'<td class="col-status">' + RM.Components.escapeHtml(r.status) + '</td>' +
					'<td class="col-action">' +
					'<a href="' + RM.Links.page('case-workspace', { clientId: r.clientId, tab: 'services' }) +
					'" class="btn btn-sm btn-secondary">Open</a></td></tr>';
			}).join('');

			document.getElementById('cbo-open-list').innerHTML =
				'<div class="table-responsive">' +
				'<table class="data-table services-cbo-table">' +
				'<thead><tr><th>Client</th><th>CBO</th><th>Status</th><th></th></tr></thead>' +
				'<tbody>' + cboRows + '</tbody></table></div>';
		}
	}
})();
