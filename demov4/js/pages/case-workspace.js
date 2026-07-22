/* global RM */
(function () {
	'use strict';

	var FH = RM.FormHelpers;

	var state = { clientId: null, activeTab: 'intake' };

	function stageCtx(client, tabId) {
		return RM.CaseForm.stageContext(client, tabId || state.activeTab);
	}

	function dis(readOnly) {
		return readOnly ? ' disabled' : '';
	}

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeModule: 'cases',
			activeNav: 'case-workspace',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.canViewCaseDetail()) {
					window.location.href = RM.Links.page('case-search');
					return;
				}
				var clientId = RM.Navigation.getQueryParam('clientId') || RM.Session.getActiveClientId();
				if (!clientId) {
					window.location.href = RM.Links.page('case-search');
					return;
				}
				RM.Session.setActiveClientId(clientId);
				state.clientId = clientId;
				state.activeTab = normalizeTab(RM.Navigation.getQueryParam('tab'), RM.ClientRepository.findById(clientId));
				renderWorkspace();
			}
		});
	});

	function tabsForClient(client) {
		return RM.CaseWorkflow ? RM.CaseWorkflow.tabsForClient(client) : [];
	}

	function normalizeTab(tab, client) {
		var tabs = tabsForClient(client);
		var valid = tabs.some(function (t) { return t.id === tab; });
		return valid ? tab : 'intake';
	}

	function renderWorkspace(options) {
		options = options || {};
		var client = RM.ClientRepository.findById(state.clientId);
		if (!client) {
			document.getElementById('page-content').innerHTML = RM.Components.alert('danger', 'Client not found.');
			return;
		}

		var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
		var closure = RM.CaseClosureRepository.findByClientId(client.id);
		var readOnly = RM.Permissions.isReadOnly() || client.status === 'closed' || !!closure;
		var main = document.getElementById('page-content');
		var shellExists = !!main.querySelector('#workspace-panel');

		var tabs = tabsForClient(client);
		var workflow = RM.CaseWorkflow.forClient(client);

		if (!shellExists || options.fullRebuild) {
			main.innerHTML =
				'<nav class="workspace-breadcrumb" aria-label="Breadcrumb">' +
				'<a href="' + RM.Links.page('case-search') + '">Case Search</a>' +
				'<span class="breadcrumb-sep" aria-hidden="true">›</span>' +
				'<span>Case: <strong id="workspace-breadcrumb-name">' + RM.Components.escapeHtml(client.name) + '</strong></span>' +
				'</nav>' +
				'<div class="workspace-header">' +
				'<div class="workspace-client">' +
				'<h1 id="workspace-client-name">' + RM.Components.escapeHtml(client.name) + '</h1>' +
				'<p class="workspace-meta" id="workspace-client-meta">' + RM.Components.formatDate(client.dob) + ' · ' + RM.Components.escapeHtml(client.phone) +
				' · ' + RM.Components.escapeHtml(RM.Components.workflowStageLabel(client)) + '</p>' +
				'<p class="workspace-workflow-meta" id="workspace-workflow-meta">' + RM.Components.escapeHtml(workflow.name) + '</p>' +
				'<div class="workspace-badges" id="workspace-badges">' + buildWorkspaceBadges(client, assessment, closure) + '</div></div>' +
				'<div class="workspace-actions">' +
				'<a href="' + RM.Links.page('client-profile', { clientId: client.id }) + '" class="btn btn-secondary btn-sm">360° View</a>' +
				'<a href="' + RM.Links.page('case-search') + '" class="btn btn-secondary btn-sm">Back to Case Search</a>' +
				'</div></div>' +
				'<div id="workspace-stepper"></div>' +
				'<div id="workspace-alerts"></div>' +
				'<nav class="workspace-tabs workspace-tabs-support" aria-label="Case records">' +
				tabs.filter(function (t) { return !t.process; }).map(function (t) {
					return '<button type="button" class="workspace-tab workspace-tab-support' + (t.id === state.activeTab ? ' active' : '') +
						'" data-tab="' + t.id + '">' + RM.Components.escapeHtml(t.label) + '</button>';
				}).join('') +
				'</nav>' +
				'<div id="workspace-panel" class="workspace-panel"></div>';

			main.querySelectorAll('.workspace-tab').forEach(function (btn) {
				btn.addEventListener('click', function () {
					state.activeTab = btn.getAttribute('data-tab');
					updateTabButtons(main);
					var freshClient = RM.ClientRepository.findById(state.clientId);
					var freshClosure = RM.CaseClosureRepository.findByClientId(state.clientId);
					var freshReadOnly = RM.Permissions.isReadOnly() || freshClient.status === 'closed' || !!freshClosure;
					renderActivePanel(freshClient, freshReadOnly, freshClosure);
				});
			});
		} else {
			updateWorkspaceHeader(client, assessment, closure);
			updateTabButtons(main);
		}

		renderActivePanel(client, readOnly, closure);
		if (RM.Stepper) {
			RM.Stepper.render('workspace-stepper', state.activeTab, client);
			wireStepperNavigation(main, client);
		}
	}

	function wireStepperNavigation(main, client) {
		var stepper = main.querySelector('#workspace-stepper');
		if (!stepper) { return; }
		stepper.querySelectorAll('.workflow-stepper a[href]').forEach(function (link) {
			link.addEventListener('click', function (e) {
				e.preventDefault();
				var href = link.getAttribute('href') || '';
				var q = href.indexOf('?') >= 0 ? href.slice(href.indexOf('?') + 1) : '';
				var tab = q ? new URLSearchParams(q).get('tab') : null;
				if (!tab) { return; }
				state.activeTab = normalizeTab(tab, client);
				updateTabButtons(main);
				var freshClient = RM.ClientRepository.findById(state.clientId);
				var freshClosure = RM.CaseClosureRepository.findByClientId(state.clientId);
				var freshReadOnly = RM.Permissions.isReadOnly() || freshClient.status === 'closed' || !!freshClosure;
				renderActivePanel(freshClient, freshReadOnly, freshClosure);
				RM.Stepper.render('workspace-stepper', state.activeTab, freshClient);
				wireStepperNavigation(main, freshClient);
			});
		});
	}

	function buildWorkspaceBadges(client, assessment, closure) {
		return RM.Components.caseCategoryBadge(client) +
			RM.Components.workflowStageBadge(client) +
			(assessment ? RM.Components.riskBadge(assessment.overallRisk) : '') +
			(client.incompleteIntake ? '<span class="incomplete-badge">Incomplete intake</span>' : '') +
			(closure ? '<span class="client-status-badge">Closed</span>' : '');
	}

	function updateWorkspaceHeader(client, assessment, closure) {
		var nameEl = document.getElementById('workspace-client-name');
		var breadcrumbName = document.getElementById('workspace-breadcrumb-name');
		var metaEl = document.getElementById('workspace-client-meta');
		var badgesEl = document.getElementById('workspace-badges');
		if (nameEl) { nameEl.textContent = client.name; }
		if (breadcrumbName) { breadcrumbName.textContent = client.name; }
		if (metaEl) {
			metaEl.textContent = RM.Components.formatDate(client.dob) + ' · ' + (client.phone || '') +
				' · ' + RM.Components.workflowStageLabel(client);
		}
		if (badgesEl) {
			badgesEl.innerHTML = buildWorkspaceBadges(client, assessment, closure);
		}
	}

	function updateTabButtons(main) {
		main.querySelectorAll('.workspace-tab').forEach(function (btn) {
			btn.classList.toggle('active', btn.getAttribute('data-tab') === state.activeTab);
		});
	}

	function renderActivePanel(client, readOnly, closure) {
		var panel = document.getElementById('workspace-panel');
		if (!panel) { return; }
		switch (state.activeTab) {
			case 'intake': renderIntakeTab(panel, client, readOnly); break;
			case 'assessment': renderComprehensiveAssessmentTab(panel, client, readOnly); break;
			case 'risk': renderRiskTab(panel, client, readOnly); break;
			case 'careplan': renderCarePlanTab(panel, client, readOnly); break;
			case 'services': renderServicesTab(panel, client, readOnly); break;
			case 'followup': renderFollowupTab(panel, client, readOnly); break;
			case 'reassessment': renderReassessmentTab(panel, client, readOnly); break;
			case 'documents': renderDocumentsTab(panel, client, readOnly); break;
			case 'activity': renderActivityTab(panel, client); break;
			case 'closure': renderClosureTab(panel, client, readOnly || !!closure); break;
		}
	}

	function showAlert(type, message) {
		if (type === 'success') {
			RM.Components.showToast(message, 'success');
			return;
		}
		document.getElementById('workspace-alerts').innerHTML = RM.Components.alert(type, message);
	}

	function renderIntakeTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'intake');
		panel.innerHTML =
			'<form id="intake-form" class="card">' +
			RM.CaseForm.intakeFormHtml(ctx, {
				readOnly: readOnly,
				submitLabel: readOnly ? '' : RM.CaseForm.saveContinueLabel(ctx, 'Save Referral &amp; Intake')
			}) +
			'</form>';

		var intake = RM.IntakeRepository.findByClientId(client.id);
		var ref = RM.ReferralRepository.findByClientId(client.id)[0];
		RM.CaseForm.populateIntakeForm(client, ctx.config, intake, ref);

		if (!readOnly) {
			document.getElementById('intake-form').addEventListener('submit', function (e) {
				e.preventDefault();
				saveIntake(client);
			});
		}
	}

	function saveIntake(client) {
		var ctx = stageCtx(client, 'intake');
		var payload = RM.CaseForm.readIntakePayload(ctx.config);
		var incomplete = !payload.partial.dob || !payload.intake.consentOnFile;

		client.name = payload.partial.name;
		client.dob = payload.partial.dob;
		client.phone = payload.partial.phone;
		client.address = document.getElementById('client-address').value.trim();
		client.incompleteIntake = incomplete;
		client = RM.ClientRepository.save(client);

		var refs = RM.ReferralRepository.findByClientId(client.id);
		if (refs.length) {
			RM.ReferralRepository.update(refs[0].id, payload.referral);
		} else {
			RM.ReferralRepository.save(Object.assign({ clientId: client.id, dateReceived: today() }, payload.referral));
		}

		var existingIntake = RM.IntakeRepository.findByClientId(client.id);
		RM.IntakeRepository.save(Object.assign({}, existingIntake || { clientId: client.id }, payload.intake, {
			completeness: incomplete ? 'incomplete' : 'complete'
		}));

		RM.Audit.record('client:' + client.id, 'intake_updated', client.name);
		var nextTab = incomplete ? 'intake' : (ctx.nextTabId || 'assessment');
		RM.Workflow.setStage(client.id, RM.CaseWorkflow.stageForTab(client, nextTab));
		showAlert('success', ctx.title + ' saved.');
		state.activeTab = nextTab;
		renderWorkspace({ fullRebuild: false });
	}

	function renderComprehensiveAssessmentTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'assessment');
		var cfg = ctx.config;
		var intake = RM.IntakeRepository.findByClientId(client.id);
		var referral = RM.ReferralRepository.findByClientId(client.id)[0];
		var summary = intake && intake.comprehensiveAssessmentNotes ? intake.comprehensiveAssessmentNotes : '';

		panel.innerHTML =
			'<div class="card"><h3 class="form-section-title">Intake summary</h3>' +
			'<p><strong>Referral source:</strong> ' + RM.Components.escapeHtml(referral ? referral.source : '—') +
			' · <strong>Reason:</strong> ' + RM.Components.escapeHtml(referral ? referral.reason : '—') + '</p>' +
			'<p><strong>' + RM.Components.escapeHtml(cfg.livingLabel) + ':</strong> ' + RM.Components.escapeHtml(intake ? intake.livingArrangement || '—' : '—') + '</p>' +
			'<p><strong>' + RM.Components.escapeHtml(cfg.assessmentSummaryBackgroundLabel) + ':</strong> ' + RM.Components.escapeHtml(intake ? intake.medicalHistory || '—' : '—') + '</p></div>' +
			'<form id="comprehensive-form" class="card">' +
			RM.CaseForm.panelHeader(ctx) +
			'<div class="form-group"><label for="comprehensive-notes">' + RM.Components.escapeHtml(cfg.assessmentNoteLabel) + '</label>' +
			'<textarea id="comprehensive-notes" rows="5" placeholder="' + RM.Components.escapeHtml(cfg.assessmentNotePlaceholder) + '"' + dis(readOnly) + '></textarea></div>' +
			(!readOnly ? '<div class="form-actions"><button type="submit" class="btn btn-primary">' +
			RM.CaseForm.saveContinueLabel(ctx, 'Save assessment') + '</button></div>' : '') +
			'</form>';

		document.getElementById('comprehensive-notes').value = summary;

		if (!readOnly) {
			document.getElementById('comprehensive-form').addEventListener('submit', function (e) {
				e.preventDefault();
				var notes = document.getElementById('comprehensive-notes').value.trim();
				var existingIntake = RM.IntakeRepository.findByClientId(client.id);
				RM.IntakeRepository.save(Object.assign({}, existingIntake || { clientId: client.id }, {
					comprehensiveAssessmentNotes: notes
				}));
				var nextTab = ctx.nextTabId || 'risk';
				RM.Workflow.setStage(client.id, RM.CaseWorkflow.stageForTab(client, nextTab));
				showAlert('success', ctx.title + ' saved.');
				state.activeTab = nextTab;
				renderWorkspace({ fullRebuild: false });
			});
		}
	}

	function renderRiskTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'risk');
		var cfg = ctx.config;
		var existing = RM.RiskAssessmentRepository.findLatest(client.id);
		panel.innerHTML =
			'<form id="risk-form" class="card">' +
			RM.CaseForm.panelHeader(ctx) +
			RM.CaseForm.riskScoringGuideHtml() +
			ratingsTable('risk', existing ? existing.ratings : {}, readOnly, ctx.domains) +
			'<div class="form-group"><label for="override-note">' + RM.Components.escapeHtml(cfg.riskOverrideLabel) + '</label>' +
			'<textarea id="override-note" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<div id="risk-score-summary"></div>' +
			(!readOnly ? '<div class="form-actions"><button type="submit" class="btn btn-primary">' +
			RM.CaseForm.saveContinueLabel(ctx, 'Save ratings') + '</button></div>' : '') +
			'</form>';

		if (existing && existing.overrideNote) {
			document.getElementById('override-note').value = existing.overrideNote;
		}
		wireComposite('risk-form', 'risk', ctx.domains, 'risk-score-summary', existing);

		if (!readOnly) {
			document.getElementById('risk-form').addEventListener('submit', function (e) {
				e.preventDefault();
				var ratings = readRatings('risk', ctx.domains);
				var calc = RM.CaseForm.calcComposite(ratings, ctx.domains);
				RM.RiskAssessmentRepository.upsertLatest(client.id, {
					date: today(),
					ratings: ratings,
					compositeScore: calc.compositeScore,
					overallRisk: calc.overallRisk,
					overrideNote: document.getElementById('override-note').value.trim() || null,
					assessorId: RM.Session.getCurrentUser().id
				});
				var nextTab = ctx.nextTabId || 'careplan';
				RM.Workflow.setStage(client.id, RM.CaseWorkflow.stageForTab(client, nextTab));
				showAlert('success', ctx.title + ' saved.');
				state.activeTab = nextTab;
				renderWorkspace({ fullRebuild: false });
			});
		}
	}

	function renderCarePlanTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'careplan');
		var cfg = ctx.config;
		panel.innerHTML =
			(!readOnly ? '<form id="careplan-form" class="card">' + RM.CaseForm.panelHeader(ctx) +
			'<div class="form-row">' +
			textInput('cp-issue', cfg.carePlanIssueLabel, true, readOnly) +
			textInput('cp-goal', cfg.carePlanGoalLabel, true, readOnly) +
			textInput('cp-service', cfg.carePlanServiceLabel, true, readOnly) +
			selectField('cp-status', 'Status', FH.CARE_PLAN_STATUSES, false) +
			'</div><button type="submit" class="btn btn-primary">Add item</button></form>' : '') +
			'<div class="card"><h2>' + RM.Components.escapeHtml(cfg.carePlanListTitle) + '</h2><div id="careplan-list"></div></div>';

		renderCarePlanList(client.id, readOnly, cfg);

		if (!readOnly) {
			FH.setSelectValue(document.getElementById('cp-status'), 'Not Started');
			document.getElementById('careplan-form').addEventListener('submit', function (e) {
				e.preventDefault();
				RM.CarePlanRepository.save({
					clientId: client.id,
					issue: document.getElementById('cp-issue').value.trim(),
					goal: document.getElementById('cp-goal').value.trim(),
					service: document.getElementById('cp-service').value.trim(),
					status: document.getElementById('cp-status').value,
					voided: false
				});
				document.getElementById('careplan-form').reset();
				renderCarePlanList(client.id, readOnly);
				showAlert('success', 'Care plan item added.');
			});
		}
	}

	function renderCarePlanList(clientId, readOnly, cfg) {
		cfg = cfg || stageCtx(RM.ClientRepository.findById(clientId), 'careplan').config;
		var items = RM.CarePlanRepository.findAllRecordsByClientId(clientId);
		var el = document.getElementById('careplan-list');
		if (!items.length) {
			el.innerHTML = RM.Components.emptyState('No plan items', 'Add ' + cfg.carePlanIssueLabel.toLowerCase() + ', ' + cfg.carePlanGoalLabel.toLowerCase() + ', and ' + cfg.carePlanServiceLabel.toLowerCase() + ' above.');
			return;
		}
		el.innerHTML = '<table class="data-table"><thead><tr><th>' + RM.Components.escapeHtml(cfg.carePlanIssueLabel) +
			'</th><th>' + RM.Components.escapeHtml(cfg.carePlanGoalLabel) + '</th><th>' + RM.Components.escapeHtml(cfg.carePlanServiceLabel) +
			'</th><th>Status</th><th></th></tr></thead><tbody>' +
			items.map(function (i) {
				var rowClass = i.voided ? 'voided-row' : '';
				return '<tr class="' + rowClass + '"><td>' + RM.Components.escapeHtml(i.issue) + RM.Components.voidedLabel(i) +
					'</td><td>' + RM.Components.escapeHtml(i.goal) +
					'</td><td>' + RM.Components.escapeHtml(i.service) + '</td><td>' + RM.Components.escapeHtml(i.status) +
					'</td><td>' + (!readOnly && !i.voided && RM.Permissions.can('voidOwn') ?
						'<button type="button" class="btn btn-sm btn-danger" data-void-cp="' + i.id + '">Void</button>' : '') + '</td></tr>';
			}).join('') + '</tbody></table>';

		el.querySelectorAll('[data-void-cp]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				RM.Components.promptVoid(function (reason) {
					RM.CarePlanRepository.void(btn.getAttribute('data-void-cp'), reason, RM.Session.getCurrentUser().id);
					renderCarePlanList(clientId, readOnly, cfg);
					refreshActivityPanel(clientId);
				});
			});
		});
	}

	function renderServicesTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'services');
		var cfg = ctx.config;
		var events = RM.ReportEngine.EVENTS;
		panel.innerHTML =
			'<div class="card">' + RM.CaseForm.panelHeader(ctx) +
			(!readOnly ? '<div class="bulk-toolbar">' +
			'<div class="form-group" style="margin:0"><label for="enroll-event">Enroll in program</label>' +
			'<select id="enroll-event">' + events.map(function (e) {
				return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
			}).join('') + '</select></div>' +
			'<button type="button" id="btn-enroll-one" class="btn btn-primary">Enroll client</button></div>' : '') +
			'<div id="enrollment-list"></div></div>' +
			'<div class="card"><h2>' + RM.Components.escapeHtml(cfg.cboTitle) + '</h2><div id="cbo-block"></div></div>';

		renderEnrollmentList(client.id, readOnly);
		renderCboBlock(client.id, readOnly);

		if (!readOnly && RM.Permissions.can('bulkEnroll')) {
			document.getElementById('btn-enroll-one').addEventListener('click', function () {
				var eventId = document.getElementById('enroll-event').value;
				RM.ServiceEnrollmentRepository.bulkEnroll([client.id], eventId, RM.Session.getCurrentUser().id);
				renderEnrollmentList(client.id, readOnly);
				showAlert('success', 'Client enrolled.');
			});
		}
	}

	function renderEnrollmentList(clientId, readOnly) {
		var enr = RM.ServiceEnrollmentRepository.findAllRecordsByClientId(clientId);
		var el = document.getElementById('enrollment-list');
		if (!enr.length) {
			el.innerHTML = RM.Components.emptyState('No enrollments', 'Enroll this client in a program above.');
			return;
		}
		el.innerHTML = '<table class="data-table"><thead><tr><th>Program</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>' +
			enr.map(function (e) {
				var ev = RM.ReportEngine.EVENTS.find(function (x) { return x.id === e.serviceOrEventId; });
				var rowClass = e.voided ? 'voided-row' : '';
				return '<tr class="' + rowClass + '"><td>' + RM.Components.escapeHtml(ev ? ev.name : e.serviceOrEventId) +
					RM.Components.voidedLabel(e) + '</td>' +
					'<td>' + RM.Components.formatDate(e.dateEnrolled) + '</td><td>' + RM.Components.escapeHtml(e.status) +
					'</td><td>' + (!readOnly && !e.voided && RM.Permissions.can('voidOwn') ?
						'<button type="button" class="btn btn-sm btn-danger" data-void-enr="' + e.id + '">Void</button>' : '') + '</td></tr>';
			}).join('') + '</tbody></table>';

		el.querySelectorAll('[data-void-enr]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				RM.Components.promptVoid(function (reason) {
					RM.ServiceEnrollmentRepository.void(btn.getAttribute('data-void-enr'), reason, RM.Session.getCurrentUser().id);
					renderEnrollmentList(clientId, readOnly);
					refreshActivityPanel(clientId);
				});
			});
		});
	}

	function renderCboBlock(clientId, readOnly) {
		var el = document.getElementById('cbo-block');
		var cbos = RM.CBOReferralRepository.findByClientId(clientId);
		var formHtml = !readOnly ?
			'<form id="cbo-form"><div class="form-row">' +
			textInput('cbo-name', 'CBO name', true, readOnly) +
			selectField('cbo-status', 'Status', FH.CBO_STATUSES, false) +
			'</div><button type="submit" class="btn btn-primary">Add CBO Referral</button></form>' : '';
		el.innerHTML = formHtml + '<div id="cbo-list"></div>';

		var listEl = document.getElementById('cbo-list');
		listEl.innerHTML = cbos.length ?
			'<ul>' + cbos.map(function (r) {
				return '<li>' + RM.Components.escapeHtml(r.cboName) + ' — ' + RM.Components.escapeHtml(r.status) +
					' (' + RM.Components.formatDate(r.date) + ')</li>';
			}).join('') + '</ul>' :
			RM.Components.emptyState('No CBO referrals', 'Refer out to community organizations.');

		if (!readOnly) {
			FH.setSelectValue(document.getElementById('cbo-status'), 'Pending');
			document.getElementById('cbo-form').addEventListener('submit', function (e) {
				e.preventDefault();
				RM.CBOReferralRepository.save({
					clientId: clientId,
					cboName: document.getElementById('cbo-name').value.trim(),
					status: document.getElementById('cbo-status').value,
					date: today()
				});
				document.getElementById('cbo-form').reset();
				renderCboBlock(clientId, readOnly);
				showAlert('success', 'CBO referral added.');
			});
		}
	}

	function renderFollowupTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'followup');
		var cfg = ctx.config;
		var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
		var cadence = assessment ? RM.FollowUpCadenceService.getCadence(assessment.overallRisk) : null;

		panel.innerHTML =
			'<div class="card"><h2>' + RM.Components.escapeHtml(cfg.followupCadenceTitle) + '</h2>' +
			'<p>Risk: ' + (assessment ? RM.Components.riskBadge(assessment.overallRisk) : 'Unknown') +
			(cadence ? ' · Recommended cadence: <strong>' + cadence.label + '</strong>' : '') + '</p></div>' +
			'<div class="card">' + RM.CaseForm.panelHeader(ctx) +
			(!readOnly ? '<form id="note-form"><div class="form-row">' +
			selectField('note-type', 'Type', cfg.noteTypes, false) +
			'<div class="form-group"><label for="note-text">Note</label><textarea id="note-text" rows="3" required></textarea></div></div>' +
			'<button type="submit" class="btn btn-primary">Log follow-up</button></form>' : '') +
			'<div id="notes-list"></div></div>';

		renderNotesList(client.id, readOnly);

		if (!readOnly) {
			FH.setSelectValue(document.getElementById('note-type'), cfg.noteTypes[0]);
			document.getElementById('note-form').addEventListener('submit', function (e) {
				e.preventDefault();
				RM.CaseNoteRepository.save({
					clientId: client.id,
					authorId: RM.Session.getCurrentUser().id,
					date: today(),
					type: document.getElementById('note-type').value,
					text: document.getElementById('note-text').value.trim(),
					voided: false
				});
				document.getElementById('note-form').reset();
				renderNotesList(client.id, readOnly);
				showAlert('success', 'Follow-up note logged.');
			});
		}
	}

	function renderNotesList(clientId, readOnly) {
		var notes = RM.CaseNoteRepository.findAllRecordsByClientId(clientId);
		var el = document.getElementById('notes-list');
		if (!notes.length) {
			el.innerHTML = RM.Components.emptyState('No follow-up notes', 'Log phone calls and home visits here.');
			return;
		}
		el.innerHTML = notes.map(function (n) {
			var rowClass = n.voided ? 'note-entry voided-row' : 'note-entry';
			return '<div class="' + rowClass + '"><div class="note-meta">' + RM.Components.formatDate(n.date) +
				' · ' + RM.Components.escapeHtml(n.type) + RM.Components.voidedLabel(n) + '</div><p>' +
				RM.Components.escapeHtml(n.text) + '</p>' +
				(!readOnly && !n.voided && RM.Permissions.can('voidOwn') ?
					'<button type="button" class="btn btn-sm btn-danger" data-void-note="' + n.id + '">Void</button>' : '') +
				'</div>';
		}).join('');

		el.querySelectorAll('[data-void-note]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				RM.Components.promptVoid(function (reason) {
					RM.CaseNoteRepository.void(btn.getAttribute('data-void-note'), reason, RM.Session.getCurrentUser().id);
					renderNotesList(clientId, readOnly);
					refreshActivityPanel(clientId);
				});
			});
		});
	}

	function renderReassessmentTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'reassessment');
		var cfg = ctx.config;
		var domains = ctx.domains;
		var previous = RM.RiskAssessmentRepository.findLatest(client.id);
		panel.innerHTML =
			(previous ? '<div class="card"><h3 class="form-section-title">Current assessment (' + RM.Components.formatDate(previous.date) + ')</h3>' +
				'<div id="previous-risk-score"></div>' +
				ratingsTable('prev', previous.ratings, true, domains) + '</div>' : '') +
			(!readOnly ? '<form id="reassessment-form" class="card">' + RM.CaseForm.panelHeader(ctx) +
			RM.CaseForm.riskScoringGuideHtml() +
			selectField('re-trigger', 'Trigger', cfg.reassessmentTriggers, false) +
			ratingsTable('re', {}, false, domains) +
			'<div id="reassessment-score-summary"></div>' +
			'<button type="submit" class="btn btn-primary">' + RM.CaseForm.saveContinueLabel(ctx, 'Save reassessment') + '</button></form>' : '') +
			'<div class="card"><h2>History</h2><div id="rehistory"></div></div>';

		if (previous) {
			document.getElementById('previous-risk-score').innerHTML = RM.CaseForm.formatRiskScoreSummary(previous, {
				label: 'Current final risk score',
				assessedDate: previous.date
			});
		}

		renderRehistory(client);

		if (!readOnly) {
			FH.setSelectValue(document.getElementById('re-trigger'), cfg.reassessmentTriggers[0]);
			wireComposite('reassessment-form', 're', domains, 'reassessment-score-summary', previous);
			document.getElementById('reassessment-form').addEventListener('submit', function (e) {
				e.preventDefault();
				var newRatings = readRatings('re', domains);
				var calc = RM.CaseForm.calcComposite(newRatings, domains);
				RM.ReassessmentRepository.save({
					clientId: client.id,
					date: today(),
					previousRatings: previous ? previous.ratings : {},
					newRatings: newRatings,
					trigger: document.getElementById('re-trigger').value
				});
				RM.RiskAssessmentRepository.upsertLatest(client.id, {
					date: today(),
					ratings: newRatings,
					compositeScore: calc.compositeScore,
					overallRisk: calc.overallRisk,
					assessorId: RM.Session.getCurrentUser().id
				});
				showAlert('success', 'Reassessment saved.');
				renderWorkspace({ fullRebuild: false });
			});
		}
	}

	function renderRehistory(client) {
		var list = RM.ReassessmentRepository.findByClientId(client.id);
		var el = document.getElementById('rehistory');
		if (!list.length) {
			el.innerHTML = RM.Components.emptyState('No reassessments', 'Record a reassessment above.');
			return;
		}
		el.innerHTML = list.map(function (r) {
			return '<div class="card reassessment-history-card"><div class="note-meta">' +
				RM.Components.formatDate(r.date) + ' · ' + RM.Components.escapeHtml(r.trigger) + '</div>' +
				RM.Components.renderRatingsCompare(r.previousRatings, r.newRatings, client) + '</div>';
		}).join('');
	}

	function renderActivityTab(panel, client) {
		panel.innerHTML =
			'<div class="card"><h2>Activity &amp; Audit Trail</h2>' +
			'<div id="activity-log"></div></div>' +
			'<div class="card"><h2>Voided Entries</h2><div id="voided-summary"></div></div>';
		renderActivityPanel(client.id);
	}

	function renderActivityPanel(clientId) {
		var logEl = document.getElementById('activity-log');
		var voidEl = document.getElementById('voided-summary');
		if (!logEl) { return; }

		var entries = RM.Audit.findForClient(clientId);
		logEl.innerHTML = RM.Components.renderActivityLog(entries);

		if (!voidEl) { return; }
		var voidedItems = [];
		RM.ServiceEnrollmentRepository.findAllRecordsByClientId(clientId).forEach(function (e) {
			if (e.voided) {
				var ev = RM.ReportEngine.EVENTS.find(function (x) { return x.id === e.serviceOrEventId; });
				voidedItems.push('Enrollment: ' + (ev ? ev.name : e.serviceOrEventId) + ' — ' + (e.voidReason || 'No reason'));
			}
		});
		RM.CarePlanRepository.findAllRecordsByClientId(clientId).forEach(function (item) {
			if (item.voided) {
				voidedItems.push('Care plan: ' + item.issue + ' — ' + (item.voidReason || 'No reason'));
			}
		});
		RM.CaseNoteRepository.findAllRecordsByClientId(clientId).forEach(function (note) {
			if (note.voided) {
				voidedItems.push('Note (' + note.type + '): ' + (note.voidReason || 'No reason'));
			}
		});

		voidEl.innerHTML = voidedItems.length ?
			'<ul class="voided-summary-list">' + voidedItems.map(function (line) {
				return '<li class="voided-row">' + RM.Components.escapeHtml(line) + '</li>';
			}).join('') + '</ul>' :
			RM.Components.emptyState('No voided entries', 'Voided enrollments, notes, and care plan items appear here with reasons.');
	}

	function refreshActivityPanel(clientId) {
		if (state.activeTab === 'activity') {
			renderActivityPanel(clientId);
		}
	}

	function renderDocumentsTab(panel, client, readOnly) {
		panel.innerHTML =
			'<div class="card"><h2>Document Vault</h2>' +
			RM.DocumentService.renderVaultBody(readOnly) +
			'</div>';

		if (!readOnly) {
			RM.DocumentService.mountVault(client.id, panel, 'case-workspace', {
				onNotify: function (message, type) {
					if (message && type) {
						showAlert(type, message);
					}
				}
			});
		} else {
			RM.DocumentService.mountList(client.id, panel);
		}
	}

	function renderClosureTab(panel, client, readOnly) {
		var ctx = stageCtx(client, 'closure');
		var cfg = ctx.config;
		var existing = RM.CaseClosureRepository.findByClientId(client.id);
		panel.innerHTML =
			(existing ? RM.Components.alert('info', 'Case closed on ' + RM.Components.formatDate(existing.date) + '.') : '') +
			'<form id="closure-form" class="card">' + RM.CaseForm.panelHeader(ctx) +
			selectField('closure-reason', 'Closure reason', FH.CLOSURE_REASONS, true) +
			'<div class="form-group"><label for="services-provided">' + RM.Components.escapeHtml(cfg.closureServicesLabel) + '</label><textarea id="services-provided" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<div class="form-group"><label for="outcomes">' + RM.Components.escapeHtml(cfg.closureOutcomesLabel) + '</label><textarea id="outcomes" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<div class="form-group"><label for="remaining-risks">' + RM.Components.escapeHtml(cfg.closureRisksLabel) + '</label><textarea id="remaining-risks" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<div class="form-group"><label for="referral-forward">' + RM.Components.escapeHtml(cfg.closureReferralLabel) + '</label><textarea id="referral-forward" rows="2"' + dis(readOnly) + '></textarea></div>' +
			(!readOnly ? '<button type="submit" class="btn btn-primary">Complete ' + RM.Components.escapeHtml(ctx.title) + '</button>' : '') +
			'</form>';

		if (existing) {
			FH.setSelectValue(document.getElementById('closure-reason'), existing.reason);
			document.getElementById('services-provided').value = existing.outcomesSummary.servicesProvided || '';
			document.getElementById('outcomes').value = existing.outcomesSummary.outcomesAchieved || '';
			document.getElementById('remaining-risks').value = existing.outcomesSummary.remainingRisks || '';
			document.getElementById('referral-forward').value = existing.outcomesSummary.referralForward || '';
		}

		if (!readOnly) {
			document.getElementById('closure-form').addEventListener('submit', function (e) {
				e.preventDefault();
				if (!window.confirm('Close this case? It will become read-only but remain searchable.')) { return; }
				RM.CaseClosureRepository.save({
					clientId: client.id,
					date: today(),
					reason: document.getElementById('closure-reason').value,
					outcomesSummary: {
						servicesProvided: document.getElementById('services-provided').value.trim(),
						outcomesAchieved: document.getElementById('outcomes').value.trim(),
						remainingRisks: document.getElementById('remaining-risks').value.trim(),
						referralForward: document.getElementById('referral-forward').value.trim()
					}
				});
				client.status = 'closed';
				RM.ClientRepository.save(client);
				RM.Audit.record('client:' + client.id, 'case_closed', document.getElementById('closure-reason').value);
				showAlert('success', 'Case closed.');
				renderWorkspace({ fullRebuild: false });
			});
		}
	}

	function ratingsTable(prefix, ratings, disabled, domains) {
		if (!domains || !domains.length) {
			domains = RM.CaseForm.domainsForClient({ caseSubcategoryId: 'sub-seniors-at-risk' });
		}
		var namePrefix = prefix === 'assessment' ? '' : prefix + '-';
		return '<table class="data-table rating-table"><thead><tr><th>Domain</th>' +
			FH.LEVELS.map(function (l) { return '<th>' + l + '</th>'; }).join('') +
			'</tr></thead><tbody>' +
			domains.map(function (d) {
				return '<tr><td>' + RM.CaseForm.domainLabel(d) + '</td>' +
					FH.LEVELS.map(function (l) {
						var checked = FH.ratingMatches(ratings[d], l) ? ' checked' : '';
						var name = disabled && prefix === 'prev' ? '' : ' name="' + namePrefix + d + '"';
						return '<td><input type="radio"' + name + ' value="' + l + '"' + checked +
							(disabled ? ' disabled' : ' required') + '></td>';
					}).join('') + '</tr>';
			}).join('') + '</tbody></table>';
	}

	function readRatings(prefix, domains) {
		if (!domains || !domains.length) {
			domains = RM.CaseForm.domainsForClient({ caseSubcategoryId: 'sub-seniors-at-risk' });
		}
		var ratings = {};
		var namePrefix = prefix === 'assessment' ? '' : prefix + '-';
		domains.forEach(function (d) {
			var sel = document.querySelector('[name="' + namePrefix + d + '"]:checked');
			ratings[d] = sel ? sel.value : null;
		});
		return ratings;
	}

	function wireComposite(formId, ratingPrefix, domains, summaryElId, savedAssessment) {
		if (!domains || !domains.length) {
			domains = RM.CaseForm.domainsForClient({ caseSubcategoryId: 'sub-seniors-at-risk' });
		}
		summaryElId = summaryElId || 'composite-display';
		ratingPrefix = ratingPrefix || (formId === 'assessment-form' ? 'assessment' : 're');
		var namePrefix = ratingPrefix === 'assessment' ? '' : ratingPrefix + '-';

		function update() {
			var el = document.getElementById(summaryElId);
			if (!el) { return; }
			var ratings = readRatings(ratingPrefix, domains);
			if (domains.some(function (d) { return !ratings[d]; })) {
				if (savedAssessment && savedAssessment.compositeScore != null && ratingPrefix === 'risk') {
					el.innerHTML = RM.CaseForm.formatRiskScoreSummary(savedAssessment, {
						label: 'Final risk score',
						assessedDate: savedAssessment.date
					});
				} else {
					el.innerHTML = RM.CaseForm.formatRiskScoreSummary(null, { label: 'Final risk score' });
				}
				return;
			}
			var calc = RM.CaseForm.calcComposite(ratings, domains);
			el.innerHTML = RM.CaseForm.formatRiskScoreSummary(calc, {
				label: ratingPrefix === 'risk' ? 'Final risk score' : 'Updated risk score'
			});
		}
		domains.forEach(function (d) {
			document.querySelectorAll('[name="' + namePrefix + d + '"]').forEach(function (r) {
				r.addEventListener('change', update);
			});
		});
		update();
	}

	function selectField(id, label, options, required) {
		return '<div class="form-group"><label for="' + id + '">' + label + '</label><select id="' + id + '"' +
			(required ? ' required' : '') + '><option value="">Select…</option>' +
			options.map(function (o) { return '<option value="' + o + '">' + o + '</option>'; }).join('') +
			'</select></div>';
	}

	function textField(id, label, rows, readOnly) {
		return '<div class="form-group"><label for="' + id + '">' + label + '</label>' +
			'<textarea id="' + id + '" rows="' + rows + '"' + dis(readOnly) + '></textarea></div>';
	}

	function textInput(id, label, required, readOnly) {
		return '<div class="form-group"><label for="' + id + '">' + label + '</label>' +
			'<input type="text" id="' + id + '"' + (required ? ' required' : '') + dis(readOnly) + '></div>';
	}

	function today() {
		return new Date().toISOString().slice(0, 10);
	}
})();
