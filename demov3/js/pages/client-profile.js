/* global RM */
(function () {
	'use strict';

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

	function esc(text) {
		return RM.Components.escapeHtml(text);
	}

	function sectionWrap(section, client, bodyHtml, options) {
		options = options || {};
		return '<section class="profile-360-section" id="profile-section-' + esc(section.tabId) + '">' +
			RM.CaseForm.profileSectionHeader(section, client, options) +
			'<div class="profile-360-section-body">' + bodyHtml + '</div></section>';
	}

	function renderProfile(client) {
		var main = document.getElementById('page-content');
		var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
		var closure = RM.CaseClosureRepository.findByClientId(client.id);
		var readOnly = RM.Permissions.isReadOnly() || client.status === 'closed' || !!closure;
		var cfg = RM.CaseForm.configForClient(client);
		var profile = RM.CaseForm.profileSections(client);
		var workflow = profile.workflow;
		var focusHtml = workflow.focusAreas.length
			? '<ul class="profile-workflow-focus">' + workflow.focusAreas.map(function (f) {
				return '<li>' + esc(f) + '</li>';
			}).join('') + '</ul>'
			: '';

		main.innerHTML =
			RM.Components.pageHeader('Client 360° View', { moduleId: 'cases', lead: client.name }) +
			'<div class="profile-header">' +
			'<div class="profile-header-main">' +
			'<div class="profile-avatar" aria-hidden="true">' + RM.Components.clientInitials(client.name) + '</div>' +
			'<div><p class="profile-name">' + esc(client.name) + '</p>' +
			'<p class="profile-meta">DOB: ' + RM.Components.formatDate(client.dob) + ' · ' + esc(client.phone) + '</p>' +
			'<p class="profile-meta">' + esc(client.address) + '</p>' +
			'<p class="profile-meta profile-workflow">' + RM.Components.workflowStageBadge(client) + '</p></div></div>' +
			'<div class="profile-actions">' +
			(assessment ? RM.Components.riskBadge(assessment.overallRisk) : '') +
			(closure ? RM.Components.alert('info', 'Case closed — read only') : '') +
			'<a href="' + RM.Links.page('case-workspace', { clientId: client.id }) + '" class="btn btn-primary">Open Case Workspace</a></div></div>' +
			'<div class="profile-workflow-banner card">' +
			'<p class="profile-workflow-name">' + esc(workflow.name) + '</p>' +
			'<p class="profile-workflow-meta">' + esc(RM.CaseCategories.categoryLabel(client.caseCategoryId)) +
			' · ' + esc(RM.CaseCategories.subcategoryLabel(client.caseSubcategoryId)) + '</p>' +
			(workflow.description ? '<p class="profile-workflow-desc">' + esc(workflow.description) + '</p>' : '') +
			(focusHtml ? '<div class="profile-workflow-focus-wrap"><strong>Focus areas</strong>' + focusHtml + '</div>' : '') +
			'</div>' +
			'<div class="profile-360">' +
			renderIntakeSection(client, cfg, findSection(profile.sections, 'intake')) +
			renderAssessmentSection(client, cfg, findSection(profile.sections, 'assessment')) +
			renderRiskSection(client, findSection(profile.sections, 'risk')) +
			renderCarePlanSection(client, cfg, findSection(profile.sections, 'careplan')) +
			renderServicesSection(client, cfg, findSection(profile.sections, 'services')) +
			renderFollowupSection(client, cfg, findSection(profile.sections, 'followup')) +
			renderReassessmentSection(client, findSection(profile.sections, 'reassessment')) +
			renderClosureSection(client, cfg, findSection(profile.sections, 'closure'), closure) +
			renderDocumentsSection(client, findSection(profile.sections, 'documents'), readOnly) +
			'</div>';

		wireDocumentUpload(client.id, readOnly);
	}

	function findSection(sections, tabId) {
		return sections.find(function (s) { return s.tabId === tabId; }) || {
			tabId: tabId,
			title: tabId,
			deliverable: '',
			stageNum: null
		};
	}

	function renderIntakeSection(client, cfg, section) {
		var refs = RM.ReferralRepository.findByClientId(client.id);
		var intake = RM.IntakeRepository.findByClientId(client.id);
		var body = '';

		if (refs.length) {
			body += refs.map(function (r) {
				return '<div class="profile-subblock"><p><strong>Source:</strong> ' + esc(r.source) +
					'</p><p><strong>Reason:</strong> ' + esc(r.reason) +
					'</p><p><strong>Date:</strong> ' + RM.Components.formatDate(r.dateReceived) +
					'</p><p><strong>Referred by:</strong> ' + esc(r.referredBy) + '</p></div>';
			}).join('');
		}

		if (intake) {
			body += '<div class="profile-subblock">' +
				'<p><strong>' + esc(cfg.livingLabel) + ':</strong> ' + esc(intake.livingArrangement || '—') + '</p>' +
				'<p><strong>' + esc(cfg.backgroundLabel) + ':</strong> ' + esc(intake.medicalHistory || '—') + '</p>' +
				cfg.intakeQuestions.map(function (q) {
					var val = intake.intakeQuestions && intake.intakeQuestions[q.key];
					return '<p><strong>' + esc(q.label) + ':</strong> ' + esc(val || '—') + '</p>';
				}).join('') +
				'<p><strong>Consent on file:</strong> ' + (intake.consentOnFile ? 'Yes' : 'No') + '</p>' +
				'<p><strong>Status:</strong> ' + esc(intake.completeness || '—') + '</p></div>';
		}

		if (!body) {
			body = RM.Components.emptyState('No intake data', 'Complete ' + section.title.toLowerCase() + ' in the case workspace.');
		}

		return sectionWrap(section, client, body);
	}

	function renderAssessmentSection(client, cfg, section) {
		var intake = RM.IntakeRepository.findByClientId(client.id);
		var body = intake && intake.comprehensiveAssessmentNotes
			? '<div class="profile-subblock">' +
				'<p><strong>' + esc(cfg.assessmentSummaryBackgroundLabel) + ':</strong> ' +
				esc(intake.medicalHistory || '—') + '</p>' +
				'<p><strong>' + esc(cfg.assessmentNoteLabel) + ':</strong> ' +
				esc(intake.comprehensiveAssessmentNotes) + '</p></div>'
			: RM.Components.emptyState('No assessment summary', 'Complete ' + section.title.toLowerCase() + ' in the case workspace.');

		return sectionWrap(section, client, body);
	}

	function renderRiskSection(client, section) {
		var list = RM.RiskAssessmentRepository.findByClientId(client.id);
		var body = list.length
			? list.map(function (a) {
				return '<div class="profile-subblock">' +
					'<p class="profile-inline-meta">' + RM.Components.formatDate(a.date) +
					(a.compositeScore != null ? ' · Composite ' + a.compositeScore : '') +
					' · Overall ' + RM.Components.riskBadge(a.overallRisk) + '</p>' +
					RM.CaseForm.formatRatingsTable(a.ratings, client) + '</div>';
			}).join('')
			: RM.Components.emptyState('No ratings recorded', 'Complete ' + section.title.toLowerCase() + ' in the case workspace.');

		return sectionWrap(section, client, body);
	}

	function renderCarePlanSection(client, cfg, section) {
		var items = RM.CarePlanRepository.findByClientId(client.id);
		var body = items.length
			? '<table class="data-table"><thead><tr><th>' + esc(cfg.carePlanIssueLabel) +
				'</th><th>' + esc(cfg.carePlanGoalLabel) + '</th><th>' + esc(cfg.carePlanServiceLabel) +
				'</th><th>Status</th></tr></thead><tbody>' +
				items.map(function (i) {
					return '<tr><td>' + esc(i.issue) + '</td><td>' + esc(i.goal) +
						'</td><td>' + esc(i.service) + '</td><td>' + esc(i.status) + '</td></tr>';
				}).join('') + '</tbody></table>'
			: RM.Components.emptyState('No plan items', 'Add items in ' + esc(cfg.carePlanListTitle.toLowerCase()) + '.');

		return sectionWrap(section, client, body);
	}

	function renderServicesSection(client, cfg, section) {
		var enr = RM.ServiceEnrollmentRepository.findByClientId(client.id);
		var cbos = RM.CBOReferralRepository.findByClientId(client.id);
		var body = '';

		if (enr.length) {
			body += '<h3 class="profile-subheading">' + esc(cfg.servicesTitle) + '</h3><ul class="profile-list">' +
				enr.map(function (e) {
					var ev = RM.ReportEngine.EVENTS.find(function (x) { return x.id === e.serviceOrEventId; });
					return '<li>' + esc(ev ? ev.name : e.serviceOrEventId) + ' — ' + RM.Components.formatDate(e.dateEnrolled) + '</li>';
				}).join('') + '</ul>';
		}
		if (cbos.length) {
			body += '<h3 class="profile-subheading">' + esc(cfg.cboTitle) + '</h3><ul class="profile-list">' +
				cbos.map(function (r) {
					return '<li>' + esc(r.cboName) + ' — ' + esc(r.status) + '</li>';
				}).join('') + '</ul>';
		}
		if (!body) {
			body = RM.Components.emptyState('No services', 'Enroll client from ' + esc(cfg.servicesTitle.toLowerCase()) + '.');
		}

		return sectionWrap(section, client, body);
	}

	function renderFollowupSection(client, cfg, section) {
		var notes = RM.CaseNoteRepository.findByClientId(client.id);
		var body = notes.length
			? notes.map(function (n) {
				return '<div class="note-entry"><div class="note-meta">' + RM.Components.formatDate(n.date) +
					' · ' + esc(n.type) + '</div><p>' + esc(n.text) + '</p></div>';
			}).join('')
			: RM.Components.emptyState('No follow-up notes', 'Log notes in ' + esc(cfg.followupMonitoringTitle) + '.');

		return sectionWrap(section, client, body);
	}

	function renderReassessmentSection(client, section) {
		var list = RM.ReassessmentRepository.findByClientId(client.id);
		var body = list.length
			? list.map(function (r) {
				return '<div class="profile-subblock"><p class="profile-inline-meta">' +
					RM.Components.formatDate(r.date) + ' · Trigger: ' + esc(r.trigger) + '</p>' +
					'<div class="compare-grid"><div><h4>Previous</h4>' +
					RM.CaseForm.formatRatingsList(r.previousRatings, client) + '</div><div><h4>Current</h4>' +
					RM.CaseForm.formatRatingsList(r.newRatings, client) + '</div></div>' +
					RM.Components.renderRatingsCompare(r.previousRatings, r.newRatings, client) + '</div>';
			}).join('')
			: RM.Components.emptyState('No recorded reviews', 'Record ' + section.title.toLowerCase() + ' in the case workspace.');

		return sectionWrap(section, client, body);
	}

	function renderClosureSection(client, cfg, section, closure) {
		var body = closure
			? '<div class="profile-subblock"><p><strong>Closed:</strong> ' + RM.Components.formatDate(closure.date) +
				'</p><p><strong>Reason:</strong> ' + esc(closure.reason) + '</p>' +
				'<p><strong>' + esc(cfg.closureServicesLabel) + ':</strong> ' +
				esc(closure.outcomesSummary.servicesProvided || '—') + '</p>' +
				'<p><strong>' + esc(cfg.closureOutcomesLabel) + ':</strong> ' +
				esc(closure.outcomesSummary.outcomesAchieved || '—') + '</p>' +
				'<p><strong>' + esc(cfg.closureRisksLabel) + ':</strong> ' +
				esc(closure.outcomesSummary.remainingRisks || '—') + '</p>' +
				'<p><strong>' + esc(cfg.closureReferralLabel) + ':</strong> ' +
				esc(closure.outcomesSummary.referralForward || '—') + '</p></div>'
			: RM.Components.emptyState('Case open', section.title + ' documentation appears here when the case is closed.');

		return sectionWrap(section, client, body);
	}

	function renderDocumentsSection(client, section, readOnly) {
		var uploadHtml = readOnly ? '' :
			'<div class="form-group"><label for="doc-upload">Upload document</label>' +
			'<input type="file" id="doc-upload" accept=".pdf,.png,.jpg,.jpeg"></div>';

		return sectionWrap(section, client, uploadHtml + '<div id="doc-list"></div>', {
			workspaceLinkLabel: 'Manage in workspace'
		});
	}

	function wireDocumentUpload(clientId, readOnly) {
		renderDocList(clientId);
		if (readOnly) { return; }
		var input = document.getElementById('doc-upload');
		if (!input) { return; }
		input.addEventListener('change', function (e) {
			var file = e.target.files[0];
			if (!file) { return; }
			RM.DocumentService.upload(clientId, file, 'client-profile').then(function () {
				renderDocList(clientId);
				e.target.value = '';
			}).catch(function (err) {
				alert(err.message);
			});
		});
	}

	function renderDocList(clientId) {
		var docs = RM.DocumentRepository.findByClientId(clientId);
		var el = document.getElementById('doc-list');
		if (!el) { return; }
		if (!docs.length) {
			el.innerHTML = RM.Components.emptyState('No documents yet', 'Upload consent forms and assessments here.');
			return;
		}
		el.innerHTML = docs.map(function (d) {
			return '<div class="doc-list-item"><div><strong>' + esc(d.filename) + '</strong><br>' +
				'<span class="note-meta">' + esc(d.uploadedBy) + ' · ' +
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
})();
