/* global RM */
(function () {
	'use strict';

	var TABS = [
		'Referral & Intake',
		'Comprehensive Assessment',
		'Risk Identification',
		'Care / Service Plan',
		'Service Coordination',
		'Monitoring & Follow-Up',
		'Documents',
		'Reassessment History'
	];

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'cases',
			activeNav: 'client-profile',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.canViewCaseDetail()) {
					window.location.href = 'client-search.html';
					return;
				}
				var clientId = RM.Navigation.resolveClientId();
				if (!clientId) {
					window.location.href = 'client-search.html';
					return;
				}
				var client = RM.ClientRepository.findById(clientId);
				if (!client) {
					document.getElementById('page-content').innerHTML = RM.Components.alert('danger', 'Client not found.');
					return;
				}
				renderProfile(client);
			}
		});
	});

	function getInitials(name) {
		return (name || 'C').split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase();
	}

	function renderProfile(client) {
		var main = document.getElementById('page-content');
		var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
		var closure = RM.CaseClosureRepository.findByClientId(client.id);
		var readOnly = RM.Permissions.isReadOnly() || client.status === 'closed' || !!closure;

		main.innerHTML =
			RM.Components.pageHeader('Client 360° View', { moduleId: 'cases', lead: client.name }) +
			'<div class="profile-header">' +
			'<div class="profile-header-main">' +
			'<div class="profile-avatar" aria-hidden="true">' + getInitials(client.name) + '</div>' +
			'<div><p class="profile-name">' + RM.Components.escapeHtml(client.name) + '</p>' +
			'<p class="profile-meta">DOB: ' + RM.Components.formatDate(client.dob) + ' · ' + RM.Components.escapeHtml(client.phone) + '</p>' +
			'<p class="profile-meta">' + RM.Components.escapeHtml(client.address) + '</p>' +
			'<p class="profile-meta profile-workflow">' + RM.Components.workflowStageBadge(client) + '</p></div></div>' +
			'<div class="profile-actions">' +
			(assessment ? RM.Components.riskBadge(assessment.overallRisk) : '') +
			(closure ? RM.Components.alert('info', 'Case closed — read only') : '') +
			'<a href="' + RM.Links.page('case-workspace', { clientId: client.id }) + '" class="btn btn-primary">Open Case Workspace</a></div></div>' +
			'<nav class="tabs" role="tablist">' +
			TABS.map(function (t, i) {
				return '<button type="button" class="tab-btn' + (i === 0 ? ' active' : '') + '" data-tab="' + i + '" role="tab">' + t + '</button>';
			}).join('') +
			'</nav>' +
			TABS.map(function (t, i) {
				return '<div class="tab-panel' + (i === 0 ? ' active' : '') + '" id="tab-' + i + '" role="tabpanel"></div>';
			}).join('');

		main.querySelectorAll('.tab-btn').forEach(function (btn) {
			btn.addEventListener('click', function () {
				main.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
				main.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
				btn.classList.add('active');
				document.getElementById('tab-' + btn.getAttribute('data-tab')).classList.add('active');
			});
		});

		renderTab0(client);
		renderTab1(client);
		renderTab2(client);
		renderTab3(client);
		renderTab4(client);
		renderTab5(client);
		renderTab6(client, readOnly);
		renderTab7(client);
	}

	function renderTab0(c) {
		var refs = RM.ReferralRepository.findByClientId(c.id);
		document.getElementById('tab-0').innerHTML = refs.length
			? refs.map(function (r) {
				return '<div class="card"><p><strong>Source:</strong> ' + RM.Components.escapeHtml(r.source) +
					'</p><p><strong>Reason:</strong> ' + RM.Components.escapeHtml(r.reason) +
					'</p><p><strong>Date:</strong> ' + RM.Components.formatDate(r.dateReceived) +
					'</p><p><strong>Referred by:</strong> ' + RM.Components.escapeHtml(r.referredBy) + '</p></div>';
			}).join('')
			: RM.Components.emptyState('No referrals', 'Referral data will appear here.');
	}

	function renderTab1(c) {
		var intake = RM.IntakeRepository.findByClientId(c.id);
		document.getElementById('tab-1').innerHTML = intake
			? '<div class="card"><p><strong>Living:</strong> ' + RM.Components.escapeHtml(intake.livingArrangement || '—') +
				'</p><p><strong>Medical history:</strong> ' + RM.Components.escapeHtml(intake.medicalHistory || '—') +
				'</p><p><strong>Consent on file:</strong> ' + (intake.consentOnFile ? 'Yes' : 'No') +
				'</p><p><strong>Status:</strong> ' + RM.Components.escapeHtml(intake.completeness || '—') + '</p></div>'
			: RM.Components.emptyState('No intake', 'Complete intake in the case workspace.');
	}

	function renderTab2(c) {
		var list = RM.RiskAssessmentRepository.findByClientId(c.id);
		document.getElementById('tab-2').innerHTML = list.length
			? list.map(function (a) {
				return '<div class="card"><p>Date: ' + RM.Components.formatDate(a.date) + ' ' +
					RM.Components.riskBadge(a.overallRisk) + '</p>' +
					renderRatings(a.ratings) + '</div>';
			}).join('')
			: RM.Components.emptyState('No assessments', 'Complete a risk assessment in the case workspace.');
	}

	function renderTab3(c) {
		var items = RM.CarePlanRepository.findByClientId(c.id);
		document.getElementById('tab-3').innerHTML = items.length
			? '<table class="data-table"><thead><tr><th>Issue</th><th>Goal</th><th>Service</th><th>Status</th></tr></thead><tbody>' +
				items.map(function (i) {
					return '<tr><td>' + RM.Components.escapeHtml(i.issue) + '</td><td>' + RM.Components.escapeHtml(i.goal) +
						'</td><td>' + RM.Components.escapeHtml(i.service) + '</td><td>' + RM.Components.escapeHtml(i.status) + '</td></tr>';
				}).join('') + '</tbody></table>'
			: RM.Components.emptyState('No care plan items', 'Add goals in the Care Plan stage.');
	}

	function renderTab4(c) {
		var enr = RM.ServiceEnrollmentRepository.findByClientId(c.id);
		var cbos = RM.CBOReferralRepository.findByClientId(c.id);
		document.getElementById('tab-4').innerHTML =
			(enr.length ? '<h3>Enrollments</h3><ul>' + enr.map(function (e) {
				var ev = RM.ReportEngine.EVENTS.find(function (x) { return x.id === e.serviceOrEventId; });
				return '<li>' + RM.Components.escapeHtml(ev ? ev.name : e.serviceOrEventId) + ' — ' + RM.Components.formatDate(e.dateEnrolled) + '</li>';
			}).join('') + '</ul>' : '') +
			(cbos.length ? '<h3>CBO Referrals</h3><ul>' + cbos.map(function (r) {
				return '<li>' + RM.Components.escapeHtml(r.cboName) + ' — ' + RM.Components.escapeHtml(r.status) + '</li>';
			}).join('') + '</ul>' : '') ||
			RM.Components.emptyState('No services', 'Enroll client in programs from Service Coordination.');
	}

	function renderTab5(c) {
		var notes = RM.CaseNoteRepository.findByClientId(c.id);
		document.getElementById('tab-5').innerHTML = notes.length
			? notes.map(function (n) {
				return '<div class="note-entry"><div class="note-meta">' + RM.Components.formatDate(n.date) +
					' · ' + RM.Components.escapeHtml(n.type) + '</div><p>' + RM.Components.escapeHtml(n.text) + '</p></div>';
			}).join('')
			: RM.Components.emptyState('No case notes', 'Log follow-ups in Monitoring & Follow-up.');
	}

	function renderTab6(c, readOnly) {
		var docs = RM.DocumentRepository.findByClientId(c.id);
		var uploadHtml = readOnly ? '' :
			'<div class="form-group"><label for="doc-upload">Upload document</label>' +
			'<input type="file" id="doc-upload" accept=".pdf,.png,.jpg,.jpeg"></div>';

		document.getElementById('tab-6').innerHTML = uploadHtml + '<div id="doc-list"></div>';
		renderDocList(c.id);

		if (!readOnly) {
			document.getElementById('doc-upload').addEventListener('change', function (e) {
				var file = e.target.files[0];
				if (!file) { return; }
				RM.DocumentService.upload(c.id, file, 'client-profile').then(function () {
					renderDocList(c.id);
					e.target.value = '';
				}).catch(function (err) {
					alert(err.message);
				});
			});
		}
	}

	function renderDocList(clientId) {
		var docs = RM.DocumentRepository.findByClientId(clientId);
		var el = document.getElementById('doc-list');
		if (!docs.length) {
			el.innerHTML = RM.Components.emptyState('No documents yet', 'Upload consent forms and assessments here. Files can be previewed immediately.');
			return;
		}
		el.innerHTML = docs.map(function (d) {
			return '<div class="doc-list-item"><div><strong>' + RM.Components.escapeHtml(d.filename) + '</strong><br>' +
				'<span class="note-meta">' + RM.Components.escapeHtml(d.uploadedBy) + ' · ' +
				RM.Components.formatDate(d.uploadedAt) + ' · ' + Math.round(d.size / 1024) + ' KB</span></div>' +
				'<div><button type="button" class="btn btn-sm btn-primary" data-preview="' + d.id + '">Preview</button> ' +
				'<button type="button" class="btn btn-sm btn-secondary" data-download="' + d.id + '">Download</button></div></div>';
		}).join('');
		el.querySelectorAll('[data-preview]').forEach(function (btn) {
			btn.addEventListener('click', function () { RM.DocumentService.preview(btn.getAttribute('data-preview')); });
		});
		el.querySelectorAll('[data-download]').forEach(function (btn) {
			btn.addEventListener('click', function () { RM.DocumentService.download(btn.getAttribute('data-download')); });
		});
	}

	function renderTab7(c) {
		var list = RM.ReassessmentRepository.findByClientId(c.id);
		document.getElementById('tab-7').innerHTML = list.length
			? list.map(function (r) {
				return '<div class="card"><p>Date: ' + RM.Components.formatDate(r.date) + ' · Trigger: ' + RM.Components.escapeHtml(r.trigger) + '</p>' +
					'<div class="compare-grid"><div><h4>Previous</h4>' + renderRatings(r.previousRatings) + '</div>' +
					'<div><h4>Current</h4>' + renderRatings(r.newRatings) + '</div></div></div>';
			}).join('')
			: RM.Components.emptyState('No reassessments', 'Record reassessments in the Reassessment stage.');
	}

	function renderRatings(ratings) {
		if (!ratings) { return '—'; }
		return '<ul>' + Object.keys(ratings).map(function (k) {
			return '<li>' + RM.Components.escapeHtml(k) + ': ' + RM.Components.riskBadge(ratings[k]) + '</li>';
		}).join('') + '</ul>';
	}
})();
