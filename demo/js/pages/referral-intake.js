/* global RM */
(function () {
	'use strict';

	var FH = RM.FormHelpers;

	document.addEventListener('DOMContentLoaded', function () {
		var urlClientId = RM.Navigation.getQueryParam('clientId');
		if (urlClientId) {
			window.location.replace(FH.workspaceUrl(urlClientId, 'intake'));
			return;
		}

		RM.Boot.init({
			activeNav: 'referrals',
			onReady: function () {
				if (RM.Permissions.isAuditor()) {
					window.location.href = 'reports.html';
					return;
				}
				if (!RM.Permissions.canViewCaseDetail()) {
					window.location.href = 'client-search.html';
					return;
				}
				renderForm();
			}
		});
	});

	function renderForm() {
		var main = document.getElementById('page-content');
		main.innerHTML =
			RM.Components.pageHeader('New Referral & Intake', 'Start a new referral — complete screening below. Duplicate detection runs as you type.') +
			'<div id="alerts"></div>' +
			'<form id="referral-intake-form" class="card">' +
			'<h2 class="form-section-title">Referral</h2>' +
			'<div class="form-row form-row-2">' +
			'<div class="form-group"><label for="ref-source">Referral source</label><select id="ref-source" required>' +
			'<option value="">Select source…</option>' +
			FH.SOURCES.map(function (s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
			'</select></div>' +
			'<div class="form-group"><label for="ref-reason">Reason</label><select id="ref-reason" required>' +
			'<option value="">Select reason…</option>' +
			FH.REASONS.map(function (r) { return '<option value="' + r + '">' + r + '</option>'; }).join('') +
			'</select></div></div>' +
			'<div class="form-group"><label for="ref-by">Referred by</label><input type="text" id="ref-by" required></div>' +
			'<h2 class="form-section-title">Intake</h2>' +
			'<div class="form-row form-row-2">' +
			'<div class="form-group"><label for="client-name">Client name</label><input type="text" id="client-name" required autocomplete="name"></div>' +
			'<div class="form-group"><label for="client-dob">Date of birth</label><input type="date" id="client-dob"></div></div>' +
			'<div class="form-row form-row-2">' +
			'<div class="form-group"><label for="client-phone">Phone</label><input type="tel" id="client-phone" autocomplete="tel"></div>' +
			'<div class="form-group"><label for="client-address">Address</label><input type="text" id="client-address"></div></div>' +
			'<div class="form-group"><label for="living">Living arrangement</label><input type="text" id="living"></div>' +
			'<div class="form-group"><label for="medical">Medical history</label><textarea id="medical" rows="3"></textarea></div>' +
			'<h3 class="form-section-title" style="font-size:0.9375rem;margin-top:1rem">Intake screening questions</h3>' +
			'<div class="form-row form-row-2 form-intake-grid">' +
			'<div class="form-group"><label for="q-lives">Who do you live with?</label><textarea id="q-lives" rows="2"></textarea></div>' +
			'<div class="form-group"><label for="q-meals">Meal preparation</label><textarea id="q-meals" rows="2"></textarea></div>' +
			'<div class="form-group"><label for="q-transport">Transportation</label><textarea id="q-transport" rows="2"></textarea></div>' +
			'<div class="form-group"><label for="q-meds">Medication management</label><textarea id="q-meds" rows="2"></textarea></div></div>' +
			'<div class="form-check-row">' +
			'<label class="checkbox-label" for="consent"><input type="checkbox" id="consent"><span>Consent on file</span></label></div>' +
			'<div id="live-dedup"></div>' +
			'<div class="form-actions">' +
			'<button type="submit" class="btn btn-primary">Save &amp; Open Workspace</button>' +
			'</div></form>';

		['client-name', 'client-dob', 'client-phone'].forEach(function (id) {
			document.getElementById(id).addEventListener('input', liveDedup);
		});

		document.getElementById('referral-intake-form').addEventListener('submit', function (e) {
			e.preventDefault();
			submitForm();
		});
	}

	function liveDedup() {
		var partial = {
			name: document.getElementById('client-name').value,
			dob: document.getElementById('client-dob').value,
			phone: document.getElementById('client-phone').value
		};
		var matches = RM.DeduplicationService.check(partial, null);
		var el = document.getElementById('live-dedup');
		if (!matches.length) {
			el.innerHTML = '';
			return;
		}
		el.innerHTML = RM.Components.alert('warning',
			'Possible duplicate: ' + matches.map(function (m) {
				return m.client.name + ' (match: ' + m.matchedFields.join(', ') + ')';
			}).join('; ') + ' — <a href="#" id="dup-open">Open existing record</a>');

		document.getElementById('dup-open').addEventListener('click', function (ev) {
			ev.preventDefault();
			RM.Components.showDuplicateModal(matches, function (id) {
				window.location.href = FH.workspaceUrl(id, 'intake');
			}, function () {});
		});
	}

	function submitForm() {
		var partial = {
			name: document.getElementById('client-name').value.trim(),
			dob: document.getElementById('client-dob').value,
			phone: document.getElementById('client-phone').value.trim()
		};

		var flag = RM.CrossProgramFlagService.check(partial);
		if (flag) {
			var contactLine = flag.caseManagerPhone && flag.caseManagerPhone !== '—'
				? ' — ' + flag.caseManagerPhone
				: '';
			document.getElementById('alerts').innerHTML = RM.Components.alert('warning',
				'Cross-program flag: An active case exists — contact ' +
				RM.Components.escapeHtml(flag.caseManagerName) + contactLine + '.');
		}

		var matches = RM.DeduplicationService.check(partial, null);
		if (matches.length) {
			RM.Components.showDuplicateModal(matches, function (id) {
				window.location.href = FH.workspaceUrl(id, 'intake');
			}, function () { saveClient(partial); });
			return;
		}
		saveClient(partial);
	}

	function saveClient(partial) {
		var user = RM.Session.getCurrentUser();
		var incomplete = !partial.dob || !document.getElementById('consent').checked;
		var client = RM.ClientRepository.save({
			name: partial.name,
			dob: partial.dob,
			phone: partial.phone,
			address: document.getElementById('client-address').value.trim(),
			programId: 'prog-seniors-at-risk',
			caseManagerId: user.id,
			status: 'active',
			incompleteIntake: incomplete
		});

		RM.ReferralRepository.save({
			clientId: client.id,
			source: document.getElementById('ref-source').value,
			reason: document.getElementById('ref-reason').value,
			dateReceived: new Date().toISOString().slice(0, 10),
			referredBy: document.getElementById('ref-by').value.trim()
		});

		RM.IntakeRepository.save({
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

		RM.Audit.record('client:' + client.id, 'client_created', client.name);
		RM.Session.setActiveClientId(client.id);
		window.location.href = FH.workspaceUrl(client.id, 'assessment');
	}
})();
