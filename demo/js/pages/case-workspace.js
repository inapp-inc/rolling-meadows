/* global RM */
(function () {
	'use strict';

	var FH = RM.FormHelpers;
	var TABS = [
		{ id: 'intake', label: 'Referral & Intake' },
		{ id: 'assessment', label: 'Assessment' },
		{ id: 'careplan', label: 'Care Plan' },
		{ id: 'services', label: 'Services' },
		{ id: 'followup', label: 'Follow-up' },
		{ id: 'reassessment', label: 'Reassessment' },
		{ id: 'documents', label: 'Documents' },
		{ id: 'closure', label: 'Close Case' }
	];

	var state = { clientId: null, activeTab: 'intake' };

	document.addEventListener('DOMContentLoaded', function () {
		RM.Boot.init({
			activeNav: 'clients',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.canViewCaseDetail()) {
					window.location.href = 'client-search.html';
					return;
				}
				var clientId = RM.Navigation.getQueryParam('clientId') || RM.Session.getActiveClientId();
				if (!clientId) {
					window.location.href = 'client-search.html';
					return;
				}
				RM.Session.setActiveClientId(clientId);
				state.clientId = clientId;
				state.activeTab = normalizeTab(RM.Navigation.getQueryParam('tab'));
				renderWorkspace();
			}
		});
	});

	function normalizeTab(tab) {
		var valid = TABS.some(function (t) { return t.id === tab; });
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

		if (!shellExists || options.fullRebuild) {
			main.innerHTML =
				'<nav class="workspace-breadcrumb" aria-label="Breadcrumb">' +
				'<a href="' + RM.Links.page('client-search') + '">Client Search</a>' +
				'<span class="breadcrumb-sep" aria-hidden="true">›</span>' +
				'<span>Case: <strong id="workspace-breadcrumb-name">' + RM.Components.escapeHtml(client.name) + '</strong></span>' +
				'</nav>' +
				'<div class="workspace-header">' +
				'<div class="workspace-client">' +
				'<h1 id="workspace-client-name">' + RM.Components.escapeHtml(client.name) + '</h1>' +
				'<p class="workspace-meta" id="workspace-client-meta">' + RM.Components.formatDate(client.dob) + ' · ' + RM.Components.escapeHtml(client.phone) + '</p>' +
				'<div class="workspace-badges" id="workspace-badges">' + buildWorkspaceBadges(client, assessment, closure) + '</div></div>' +
				'<div class="workspace-actions">' +
				'<a href="' + RM.Links.page('client-profile', { clientId: client.id }) + '" class="btn btn-secondary btn-sm">360° View</a>' +
				'<a href="' + RM.Links.page('client-search') + '" class="btn btn-secondary btn-sm">Back to Search</a>' +
				'</div></div>' +
				'<p class="profile-view-note">Work the case here — referral through closure in one place. Use 360° View for read-only history.</p>' +
				'<div id="workspace-alerts"></div>' +
				'<nav class="workspace-tabs" aria-label="Case workspace sections">' +
				TABS.map(function (t) {
					return '<button type="button" class="workspace-tab' + (t.id === state.activeTab ? ' active' : '') +
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
	}

	function buildWorkspaceBadges(client, assessment, closure) {
		return (assessment ? RM.Components.riskBadge(assessment.overallRisk) : '') +
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
			metaEl.textContent = RM.Components.formatDate(client.dob) + ' · ' + (client.phone || '');
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
			case 'assessment': renderAssessmentTab(panel, client, readOnly); break;
			case 'careplan': renderCarePlanTab(panel, client, readOnly); break;
			case 'services': renderServicesTab(panel, client, readOnly); break;
			case 'followup': renderFollowupTab(panel, client, readOnly); break;
			case 'reassessment': renderReassessmentTab(panel, client, readOnly); break;
			case 'documents': renderDocumentsTab(panel, client, readOnly); break;
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
		panel.innerHTML =
			'<form id="intake-form" class="card">' +
			'<h2>Referral</h2>' +
			'<div class="form-row form-row-2">' +
			selectField('ref-source', 'Referral source', FH.SOURCES, true) +
			selectField('ref-reason', 'Reason', FH.REASONS, true) +
			'</div>' +
			'<div class="form-group"><label for="ref-by">Referred by</label><input type="text" id="ref-by" required' + dis(readOnly) + '></div>' +
			'<h2>Intake</h2>' +
			'<div class="form-row form-row-2">' +
			'<div class="form-group"><label for="client-name">Client name</label><input type="text" id="client-name" required' + dis(readOnly) + '></div>' +
			'<div class="form-group"><label for="client-dob">Date of birth</label><input type="date" id="client-dob"' + dis(readOnly) + '></div></div>' +
			'<div class="form-row form-row-2">' +
			'<div class="form-group"><label for="client-phone">Phone</label><input type="tel" id="client-phone"' + dis(readOnly) + '></div>' +
			'<div class="form-group"><label for="client-address">Address</label><input type="text" id="client-address"' + dis(readOnly) + '></div></div>' +
			'<div class="form-group"><label for="living">Living arrangement</label><input type="text" id="living"' + dis(readOnly) + '></div>' +
			'<div class="form-group"><label for="medical">Medical history</label><textarea id="medical" rows="3"' + dis(readOnly) + '></textarea></div>' +
			'<div class="form-row form-row-2 form-intake-grid">' +
			textField('q-lives', 'Who do you live with?', 2, readOnly) +
			textField('q-meals', 'Meal preparation', 2, readOnly) +
			textField('q-transport', 'Transportation', 2, readOnly) +
			textField('q-meds', 'Medication management', 2, readOnly) +
			'</div>' +
			'<div class="form-check-row"><label class="checkbox-label" for="consent">' +
			'<input type="checkbox" id="consent"' + dis(readOnly) + '><span>Consent on file</span></label></div>' +
			(!readOnly ? '<div class="form-actions"><button type="submit" class="btn btn-primary">Save Referral &amp; Intake</button></div>' : '') +
			'</form>';

		populateIntake(client);

		if (!readOnly) {
			document.getElementById('intake-form').addEventListener('submit', function (e) {
				e.preventDefault();
				saveIntake(client);
			});
		}
	}

	function populateIntake(client) {
		document.getElementById('client-name').value = client.name || '';
		document.getElementById('client-dob').value = client.dob || '';
		document.getElementById('client-phone').value = client.phone || '';
		document.getElementById('client-address').value = client.address || '';

		var intake = RM.IntakeRepository.findByClientId(client.id);
		if (intake) {
			document.getElementById('living').value = intake.livingArrangement || '';
			document.getElementById('medical').value = intake.medicalHistory || '';
			document.getElementById('consent').checked = !!intake.consentOnFile;
			if (intake.intakeQuestions) {
				document.getElementById('q-lives').value = intake.intakeQuestions.livesWith || '';
				document.getElementById('q-meals').value = intake.intakeQuestions.mealPrep || '';
				document.getElementById('q-transport').value = intake.intakeQuestions.transportation || '';
				document.getElementById('q-meds').value = intake.intakeQuestions.medication || '';
			}
		}

		var ref = RM.ReferralRepository.findByClientId(client.id)[0];
		if (ref) {
			FH.setSelectValue(document.getElementById('ref-source'), ref.source);
			FH.setSelectValue(document.getElementById('ref-reason'), ref.reason);
			document.getElementById('ref-by').value = ref.referredBy || '';
		}
	}

	function saveIntake(client) {
		var partial = {
			name: document.getElementById('client-name').value.trim(),
			dob: document.getElementById('client-dob').value,
			phone: document.getElementById('client-phone').value.trim()
		};
		var incomplete = !partial.dob || !document.getElementById('consent').checked;

		client.name = partial.name;
		client.dob = partial.dob;
		client.phone = partial.phone;
		client.address = document.getElementById('client-address').value.trim();
		client.incompleteIntake = incomplete;
		client = RM.ClientRepository.save(client);

		var refs = RM.ReferralRepository.findByClientId(client.id);
		var refData = {
			source: document.getElementById('ref-source').value,
			reason: document.getElementById('ref-reason').value,
			referredBy: document.getElementById('ref-by').value.trim()
		};
		if (refs.length) {
			RM.ReferralRepository.update(refs[0].id, refData);
		} else {
			RM.ReferralRepository.save(Object.assign({ clientId: client.id, dateReceived: today() }, refData));
		}

		var existingIntake = RM.IntakeRepository.findByClientId(client.id);
		RM.IntakeRepository.save({
			id: existingIntake ? existingIntake.id : undefined,
			clientId: client.id,
			livingArrangement: document.getElementById('living').value.trim(),
			medicalHistory: document.getElementById('medical').value.trim(),
			consentOnFile: document.getElementById('consent').checked,
			completeness: incomplete ? 'incomplete' : 'complete',
			intakeQuestions: {
				livesWith: document.getElementById('q-lives').value,
				mealPrep: document.getElementById('q-meals').value,
				transportation: document.getElementById('q-transport').value,
				medication: document.getElementById('q-meds').value
			}
		});

		RM.Audit.record('client:' + client.id, 'intake_updated', client.name);
		showAlert('success', 'Referral and intake saved.');
		state.activeTab = 'assessment';
		renderWorkspace({ fullRebuild: false });
	}

	function renderAssessmentTab(panel, client, readOnly) {
		var existing = RM.RiskAssessmentRepository.findLatest(client.id);
		panel.innerHTML =
			'<form id="assessment-form" class="card">' +
			'<h2>Risk Assessment</h2>' +
			ratingsTable('assessment', existing ? existing.ratings : {}, readOnly) +
			'<div class="form-group"><label for="override-note">Override note (optional)</label>' +
			'<textarea id="override-note" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<p id="composite-display"></p>' +
			(!readOnly ? '<div class="form-actions"><button type="submit" class="btn btn-primary">Save Assessment</button></div>' : '') +
			'</form>';

		if (existing && existing.overrideNote) {
			document.getElementById('override-note').value = existing.overrideNote;
		}
		wireComposite('assessment-form');

		if (!readOnly) {
			document.getElementById('assessment-form').addEventListener('submit', function (e) {
				e.preventDefault();
				var ratings = readRatings('assessment');
				var calc = FH.calcComposite(ratings);
				RM.RiskAssessmentRepository.upsertLatest(client.id, {
					date: today(),
					ratings: ratings,
					compositeScore: calc.compositeScore,
					overallRisk: calc.overallRisk,
					overrideNote: document.getElementById('override-note').value.trim() || null,
					assessorId: RM.Session.getCurrentUser().id
				});
				showAlert('success', 'Assessment saved.');
				state.activeTab = 'careplan';
				renderWorkspace({ fullRebuild: false });
			});
		}
	}

	function renderCarePlanTab(panel, client, readOnly) {
		panel.innerHTML =
			(!readOnly ? '<form id="careplan-form" class="card"><h2>Add Care Plan Item</h2>' +
			'<div class="form-row">' +
			textInput('cp-issue', 'Issue', true, readOnly) +
			textInput('cp-goal', 'Goal', true, readOnly) +
			textInput('cp-service', 'Service', true, readOnly) +
			selectField('cp-status', 'Status', FH.CARE_PLAN_STATUSES, false) +
			'</div><button type="submit" class="btn btn-primary">Add Item</button></form>' : '') +
			'<div class="card"><h2>Care Plan Items</h2><div id="careplan-list"></div></div>';

		renderCarePlanList(client.id, readOnly);

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

	function renderCarePlanList(clientId, readOnly) {
		var items = RM.CarePlanRepository.findByClientId(clientId);
		var el = document.getElementById('careplan-list');
		if (!items.length) {
			el.innerHTML = RM.Components.emptyState('No care plan items', 'Add issue, goal, and service above.');
			return;
		}
		el.innerHTML = '<table class="data-table"><thead><tr><th>Issue</th><th>Goal</th><th>Service</th><th>Status</th><th></th></tr></thead><tbody>' +
			items.map(function (i) {
				return '<tr><td>' + RM.Components.escapeHtml(i.issue) + '</td><td>' + RM.Components.escapeHtml(i.goal) +
					'</td><td>' + RM.Components.escapeHtml(i.service) + '</td><td>' + RM.Components.escapeHtml(i.status) +
					'</td><td>' + (!readOnly && RM.Permissions.can('voidOwn') ?
						'<button type="button" class="btn btn-sm btn-danger" data-void-cp="' + i.id + '">Void</button>' : '') + '</td></tr>';
			}).join('') + '</tbody></table>';

		el.querySelectorAll('[data-void-cp]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				RM.Components.promptVoid(function (reason) {
					RM.CarePlanRepository.void(btn.getAttribute('data-void-cp'), reason, RM.Session.getCurrentUser().id);
					renderCarePlanList(clientId, readOnly);
				});
			});
		});
	}

	function renderServicesTab(panel, client, readOnly) {
		var events = RM.ReportEngine.EVENTS;
		panel.innerHTML =
			'<div class="card"><h2>Program Enrollments</h2>' +
			(!readOnly ? '<div class="bulk-toolbar">' +
			'<div class="form-group" style="margin:0"><label for="enroll-event">Enroll in program</label>' +
			'<select id="enroll-event">' + events.map(function (e) {
				return '<option value="' + e.id + '">' + RM.Components.escapeHtml(e.name) + '</option>';
			}).join('') + '</select></div>' +
			'<button type="button" id="btn-enroll-one" class="btn btn-primary">Enroll client</button></div>' : '') +
			'<div id="enrollment-list"></div></div>' +
			'<div class="card"><h2>CBO Referrals</h2><div id="cbo-block"></div></div>';

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
		var enr = RM.ServiceEnrollmentRepository.findByClientId(clientId);
		var el = document.getElementById('enrollment-list');
		if (!enr.length) {
			el.innerHTML = RM.Components.emptyState('No enrollments', 'Enroll this client in a program above.');
			return;
		}
		el.innerHTML = '<table class="data-table"><thead><tr><th>Program</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>' +
			enr.map(function (e) {
				var ev = RM.ReportEngine.EVENTS.find(function (x) { return x.id === e.serviceOrEventId; });
				return '<tr><td>' + RM.Components.escapeHtml(ev ? ev.name : e.serviceOrEventId) + '</td>' +
					'<td>' + RM.Components.formatDate(e.dateEnrolled) + '</td><td>' + RM.Components.escapeHtml(e.status) +
					'</td><td>' + (!readOnly && RM.Permissions.can('voidOwn') ?
						'<button type="button" class="btn btn-sm btn-danger" data-void-enr="' + e.id + '">Void</button>' : '') + '</td></tr>';
			}).join('') + '</tbody></table>';

		el.querySelectorAll('[data-void-enr]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				RM.Components.promptVoid(function (reason) {
					RM.ServiceEnrollmentRepository.void(btn.getAttribute('data-void-enr'), reason, RM.Session.getCurrentUser().id);
					renderEnrollmentList(clientId, readOnly);
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
		var assessment = RM.RiskAssessmentRepository.findLatest(client.id);
		var cadence = assessment ? RM.FollowUpCadenceService.getCadence(assessment.overallRisk) : null;

		panel.innerHTML =
			'<div class="card"><h2>Follow-up Cadence</h2>' +
			'<p>Risk: ' + (assessment ? RM.Components.riskBadge(assessment.overallRisk) : 'Unknown') +
			(cadence ? ' · Recommended cadence: <strong>' + cadence.label + '</strong>' : '') + '</p></div>' +
			'<div class="card"><h2>Case Notes</h2>' +
			(!readOnly ? '<form id="note-form"><div class="form-row">' +
			selectField('note-type', 'Type', FH.NOTE_TYPES, false) +
			'<div class="form-group"><label for="note-text">Note</label><textarea id="note-text" rows="3" required></textarea></div></div>' +
			'<button type="submit" class="btn btn-primary">Log Follow-up</button></form>' : '') +
			'<div id="notes-list"></div></div>';

		renderNotesList(client.id, readOnly);

		if (!readOnly) {
			FH.setSelectValue(document.getElementById('note-type'), 'phone call');
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
		var notes = RM.CaseNoteRepository.findByClientId(clientId);
		var el = document.getElementById('notes-list');
		if (!notes.length) {
			el.innerHTML = RM.Components.emptyState('No follow-up notes', 'Log phone calls and home visits here.');
			return;
		}
		el.innerHTML = notes.map(function (n) {
			return '<div class="note-entry"><div class="note-meta">' + RM.Components.formatDate(n.date) +
				' · ' + RM.Components.escapeHtml(n.type) + '</div><p>' + RM.Components.escapeHtml(n.text) + '</p>' +
				(!readOnly && RM.Permissions.can('voidOwn') ?
					'<button type="button" class="btn btn-sm btn-danger" data-void-note="' + n.id + '">Void</button>' : '') +
				'</div>';
		}).join('');

		el.querySelectorAll('[data-void-note]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				RM.Components.promptVoid(function (reason) {
					RM.CaseNoteRepository.void(btn.getAttribute('data-void-note'), reason, RM.Session.getCurrentUser().id);
					renderNotesList(clientId, readOnly);
				});
			});
		});
	}

	function renderReassessmentTab(panel, client, readOnly) {
		var previous = RM.RiskAssessmentRepository.findLatest(client.id);
		panel.innerHTML =
			(previous ? '<div class="card"><h2>Current Assessment (' + RM.Components.formatDate(previous.date) + ')</h2>' +
				ratingsTable('prev', previous.ratings, true) + '</div>' : '') +
			(!readOnly ? '<form id="reassessment-form" class="card"><h2>Record Reassessment</h2>' +
			selectField('re-trigger', 'Trigger', FH.REASSESSMENT_TRIGGERS, false) +
			ratingsTable('re', {}, false) +
			'<button type="submit" class="btn btn-primary">Save Reassessment</button></form>' : '') +
			'<div class="card"><h2>History</h2><div id="rehistory"></div></div>';

		renderRehistory(client.id);

		if (!readOnly) {
			FH.setSelectValue(document.getElementById('re-trigger'), 'Manual');
			document.getElementById('reassessment-form').addEventListener('submit', function (e) {
				e.preventDefault();
				var newRatings = readRatings('re');
				var calc = FH.calcComposite(newRatings);
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

	function renderRehistory(clientId) {
		var list = RM.ReassessmentRepository.findByClientId(clientId);
		var el = document.getElementById('rehistory');
		if (!list.length) {
			el.innerHTML = RM.Components.emptyState('No reassessments', 'Record a reassessment above.');
			return;
		}
		el.innerHTML = list.map(function (r) {
			return '<div class="note-entry"><div class="note-meta">' + RM.Components.formatDate(r.date) +
				' · ' + RM.Components.escapeHtml(r.trigger) + '</div></div>';
		}).join('');
	}

	function renderDocumentsTab(panel, client, readOnly) {
		panel.innerHTML =
			'<div class="card"><h2>Document Vault</h2>' +
			'<p class="report-table-hint">Upload consent forms, assessments, and correspondence. Files stay with this case.</p>' +
			(!readOnly ?
				'<div class="form-group"><label for="doc-upload">Upload document</label>' +
				'<input type="file" id="doc-upload" accept=".pdf,.png,.jpg,.jpeg"></div>' : '') +
			'<div id="doc-list"></div></div>';

		renderDocList(client.id);

		if (!readOnly) {
			document.getElementById('doc-upload').addEventListener('change', function (e) {
				var file = e.target.files[0];
				if (!file) { return; }
				RM.DocumentService.upload(client.id, file, 'case-workspace').then(function () {
					renderDocList(client.id);
					e.target.value = '';
					showAlert('success', 'Document uploaded.');
				}).catch(function (err) {
					showAlert('danger', err.message);
				});
			});
		}
	}

	function renderDocList(clientId) {
		var docs = RM.DocumentRepository.findByClientId(clientId);
		var el = document.getElementById('doc-list');
		if (!el) { return; }
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

	function renderClosureTab(panel, client, readOnly) {
		var existing = RM.CaseClosureRepository.findByClientId(client.id);
		panel.innerHTML =
			(existing ? RM.Components.alert('info', 'Case closed on ' + RM.Components.formatDate(existing.date) + '.') : '') +
			'<form id="closure-form" class="card">' +
			selectField('closure-reason', 'Closure reason', FH.CLOSURE_REASONS, true) +
			'<div class="form-group"><label for="services-provided">Services provided</label><textarea id="services-provided" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<div class="form-group"><label for="outcomes">Outcomes achieved</label><textarea id="outcomes" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<div class="form-group"><label for="remaining-risks">Remaining risks</label><textarea id="remaining-risks" rows="2"' + dis(readOnly) + '></textarea></div>' +
			'<div class="form-group"><label for="referral-forward">Referral-forward information</label><textarea id="referral-forward" rows="2"' + dis(readOnly) + '></textarea></div>' +
			(!readOnly ? '<button type="submit" class="btn btn-primary">Close Case</button>' : '') +
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

	function ratingsTable(prefix, ratings, disabled) {
		var namePrefix = prefix === 'assessment' ? '' : prefix + '-';
		return '<table class="data-table rating-table"><thead><tr><th>Domain</th>' +
			FH.LEVELS.map(function (l) { return '<th>' + l + '</th>'; }).join('') +
			'</tr></thead><tbody>' +
			FH.DOMAINS.map(function (d) {
				return '<tr><td>' + FH.formatDomain(d) + '</td>' +
					FH.LEVELS.map(function (l) {
						var checked = FH.ratingMatches(ratings[d], l) ? ' checked' : '';
						var name = disabled && prefix === 'prev' ? '' : ' name="' + namePrefix + d + '"';
						return '<td><input type="radio"' + name + ' value="' + l + '"' + checked +
							(disabled ? ' disabled' : ' required') + '></td>';
					}).join('') + '</tr>';
			}).join('') + '</tbody></table>';
	}

	function readRatings(prefix) {
		var ratings = {};
		var namePrefix = prefix === 'assessment' ? '' : prefix + '-';
		FH.DOMAINS.forEach(function (d) {
			var sel = document.querySelector('[name="' + namePrefix + d + '"]:checked');
			ratings[d] = sel ? sel.value : null;
		});
		return ratings;
	}

	function wireComposite(formId) {
		function update() {
			var ratings = readRatings(formId === 'assessment-form' ? 'assessment' : 're');
			if (FH.DOMAINS.some(function (d) { return !ratings[d]; })) { return; }
			var calc = FH.calcComposite(ratings);
			var el = document.getElementById('composite-display');
			if (el) {
				el.innerHTML = 'Composite score: <strong>' + calc.compositeScore + '</strong> · Suggested risk: ' +
					RM.Components.riskBadge(calc.overallRisk);
			}
		}
		FH.DOMAINS.forEach(function (d) {
			var p = formId === 'assessment-form' ? '' : 're-';
			document.querySelectorAll('[name="' + p + d + '"]').forEach(function (r) {
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

	function dis(readOnly) {
		return readOnly ? ' disabled' : '';
	}

	function today() {
		return new Date().toISOString().slice(0, 10);
	}
})();
