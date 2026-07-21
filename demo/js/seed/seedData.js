/* global RM */
(function () {
	'use strict';

	var PROGRAM_ID = 'prog-seniors-at-risk';
	var CM_ID = 'usr-case-manager';

	RM.Seed = {
		VERSION: 8,

		load: function () {
			RM.Store.clearAll();
			this._seedUsers();
			this._seedMarySmithData();
			this._seedSeniorCaseload();
			this._seedSpecialCases();
			this._seedDuplicateCandidates();
			RM.Store.setMeta('initialized', true);
			RM.Store.setMeta('seedVersion', this.VERSION);
			RM.Audit.record('system', 'demo_reset', 'Seed data v' + this.VERSION + ' loaded');
		},

		ensureLoaded: function () {
			var version = RM.Store.getMeta('seedVersion');
			var ready = RM.Store.getMeta('initialized') === true;
			var valid = ready && version === this.VERSION && this._validate();

			if (!valid) {
				this.load();
			}
		},

		_validate: function () {
			if (!RM.UserRepository || !RM.ClientRepository || !RM.RiskAssessmentRepository) {
				return false;
			}
			return RM.UserRepository.findAll().length >= 4 &&
				RM.ClientRepository.findAll().length >= 18 &&
				RM.RiskAssessmentRepository.findAll().length >= 10;
		},

		_seedUsers: function () {
			[
				{
					id: 'usr-case-manager',
					name: 'Seniors-at-Risk Case Manager',
					role: 'case_manager',
					programId: PROGRAM_ID,
					status: 'Active',
					contactPhone: '(847) 555-0101'
				},
				{
					id: 'usr-supervisor',
					name: 'Supervisor / Dept Admin',
					role: 'supervisor',
					programId: PROGRAM_ID,
					status: 'Active',
					contactPhone: '(847) 555-0102'
				},
				{
					id: 'usr-cross-program-liaison',
					name: 'Cross-Program Liaison',
					role: 'cross_program_liaison',
					programId: 'prog-police-ss',
					status: 'Active',
					contactPhone: '(847) 555-0103'
				},
				{ id: 'usr-auditor', name: 'Auditor', role: 'auditor', programId: PROGRAM_ID, status: 'Active', contactPhone: '—' }
			].forEach(function (u) { RM.UserRepository.save(u); });
		},

		_seedClientRecord: function (client, bundle) {
			RM.ClientRepository.save(client);
			if (!bundle) { return; }

			if (bundle.referral) {
				RM.ReferralRepository.save(Object.assign({ clientId: client.id }, bundle.referral));
			}
			if (bundle.intake) {
				RM.IntakeRepository.save(Object.assign({ clientId: client.id }, bundle.intake));
			}
			if (bundle.assessment) {
				RM.RiskAssessmentRepository.save(Object.assign({ clientId: client.id, assessorId: CM_ID }, bundle.assessment));
			}
			if (bundle.carePlans) {
				bundle.carePlans.forEach(function (cp, i) {
					RM.CarePlanRepository.save(Object.assign({ clientId: client.id, voided: false }, cp, {
						id: cp.id || ('cp-' + client.id + '-' + (i + 1))
					}));
				});
			}
			if (bundle.enrollments) {
				bundle.enrollments.forEach(function (e, i) {
					RM.ServiceEnrollmentRepository.save(Object.assign({
						clientId: client.id, voided: false, enrolledBy: CM_ID, status: 'active'
					}, e, { id: e.id || ('enr-' + client.id + '-' + (i + 1)) }));
				});
			}
			if (bundle.cbo) {
				RM.CBOReferralRepository.save(Object.assign({ clientId: client.id }, bundle.cbo));
			}
			if (bundle.notes) {
				bundle.notes.forEach(function (n, i) {
					RM.CaseNoteRepository.save(Object.assign({
						clientId: client.id, authorId: CM_ID, voided: false
					}, n, { id: n.id || ('note-' + client.id + '-' + (i + 1)) }));
				});
			}
		},

		_seedMarySmithData: function () {
			this._seedClientRecord({
				id: 'cli-mary-smith',
				name: 'Mary Smith',
				dob: '1942-03-15',
				phone: '(847) 555-0142',
				address: '412 Meadow Lane, Rolling Meadows, IL 60008',
				demographics: { gender: 'F', ethnicity: 'White', age: 84 },
				programId: PROGRAM_ID,
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: false,
				currentStage: 6,
				createdAt: '2026-02-01'
			}, {
				referral: {
					id: 'ref-mary-1', source: 'Hospital', reason: 'Falls',
					dateReceived: '2026-02-01', referredBy: 'Advocate Lutheran General Hospital Social Work'
				},
				intake: {
					id: 'int-mary-1', livingArrangement: 'Lives alone in single-family home',
					medicalHistory: 'Hypertension, osteoarthritis, history of fall',
					consentOnFile: true, completeness: 'complete',
					intakeQuestions: {
						livesWith: 'Alone',
						mealPrep: 'Limited — skips meals frequently',
						transportation: 'No longer drives; relies on neighbors occasionally',
						medication: 'Self-manages with occasional missed doses'
					}
				},
				assessment: {
					id: 'ra-mary-1', date: '2026-02-05',
					ratings: { falls: 'High', nutrition: 'Medium', isolation: 'High', housing: 'Low', abuseRisk: 'Medium' },
					compositeScore: 72, overallRisk: 'High'
				},
				carePlans: [
					{ id: 'cp-mary-1', issue: 'Fall Risk', goal: 'Prevent future falls', service: 'Home safety assessment', status: 'In Progress' },
					{ id: 'cp-mary-2', issue: 'Nutrition', goal: 'Improve nutritional intake', service: 'Meals on Wheels referral', status: 'In Progress' },
					{ id: 'cp-mary-3', issue: 'Social Isolation', goal: 'Increase social engagement', service: 'Senior center enrollment', status: 'Not Started' }
				],
				enrollments: [
					{ id: 'enr-mary-meals', serviceOrEventId: 'evt-meals', dateEnrolled: '2026-03-01' },
					{ id: 'enr-mary-holiday', serviceOrEventId: 'evt-holiday', dateEnrolled: '2026-06-15' }
				],
				cbo: { id: 'cbo-mary-1', cboName: 'Meals on Wheels Northwest', cboId: 'cbo-mow', status: 'Confirmed', date: '2026-03-02' },
				notes: [
					{ id: 'note-mary-1', date: '2026-03-10', type: 'home visit', text: 'Home visit completed. Client reports dizziness when standing. Medication review scheduled.' },
					{ id: 'note-mary-2', date: '2026-07-08', type: 'phone call', text: 'Follow-up call — client missed morning medication dose yesterday.' }
				]
			});
		},

		_seedSeniorCaseload: function () {
			var seniors = [
				{ id: 'cli-john-davis', name: 'John Davis', dob: '1938-07-22', phone: '(847) 555-0201', address: '88 Oak Street, Rolling Meadows, IL', risk: 'High' },
				{ id: 'cli-elena-rodriguez', name: 'Elena Rodriguez', dob: '1940-11-03', phone: '(847) 555-0202', address: '15 Pine Court, Rolling Meadows, IL', risk: 'Medium' },
				{ id: 'cli-robert-kim', name: 'Robert Kim', dob: '1935-04-18', phone: '(847) 555-0203', address: '902 Central Rd, Rolling Meadows, IL', risk: 'Low' },
				{ id: 'cli-dorothy-williams', name: 'Dorothy Williams', dob: '1944-09-30', phone: '(847) 555-0204', address: '77 Birch Ave, Rolling Meadows, IL', risk: 'Medium' },
				{ id: 'cli-frank-miller', name: 'Frank Miller', dob: '1939-01-12', phone: '(847) 555-0205', address: '203 Willow Dr, Rolling Meadows, IL', risk: 'High' },
				{ id: 'cli-helen-chen', name: 'Helen Chen', dob: '1941-06-25', phone: '(847) 555-0206', address: '44 Maple St, Rolling Meadows, IL', risk: 'Medium' },
				{ id: 'cli-george-patel', name: 'George Patel', dob: '1937-12-08', phone: '(847) 555-0207', address: '561 Elm Way, Rolling Meadows, IL', risk: 'Low' },
				{ id: 'cli-ruth-anderson', name: 'Ruth Anderson', dob: '1943-02-14', phone: '(847) 555-0208', address: '19 Cedar Ln, Rolling Meadows, IL', risk: 'Medium' },
				{ id: 'cli-james-wilson', name: 'James Wilson', dob: '1936-08-19', phone: '(847) 555-0209', address: '330 Park Blvd, Rolling Meadows, IL', risk: 'High' },
				{ id: 'cli-margaret-lee', name: 'Margaret Lee', dob: '1945-05-07', phone: '(847) 555-0210', address: '67 Spruce Ct, Rolling Meadows, IL', risk: 'Medium' },
				{ id: 'cli-william-brown', name: 'William Brown', dob: '1934-10-31', phone: '(847) 555-0211', address: '118 Ash St, Rolling Meadows, IL', risk: 'Low' },
				{ id: 'cli-betty-taylor', name: 'Betty Taylor', dob: '1942-07-04', phone: '(847) 555-0212', address: '245 Hickory Rd, Rolling Meadows, IL', risk: 'Medium' }
			];

			var sources = ['Hospital', 'Physician', 'Police', 'Self', 'Neighbor'];
			var reasons = ['Falls', 'Isolation', 'Medication issues', 'Food insecurity', 'Self-neglect'];

			var noteDates = {
				'cli-john-davis': '2026-07-04',
				'cli-elena-rodriguez': '2026-07-01',
				'cli-robert-kim': '2026-05-01',
				'cli-dorothy-williams': '2026-06-13',
				'cli-frank-miller': '2026-07-11',
				'cli-helen-chen': '2026-06-25',
				'cli-george-patel': '2026-04-15',
				'cli-ruth-anderson': '2026-06-28',
				'cli-james-wilson': '2026-07-15',
				'cli-margaret-lee': '2026-06-13',
				'cli-william-brown': '2026-04-20',
				'cli-betty-taylor': '2026-06-20'
			};

			seniors.forEach(function (s, i) {
				var noteDate = noteDates[s.id] || '2026-07-10';
				this._seedClientRecord({
					id: s.id,
					name: s.name,
					dob: s.dob,
					phone: s.phone,
					address: s.address,
					programId: PROGRAM_ID,
					caseManagerId: CM_ID,
					status: 'active',
					incompleteIntake: false,
					createdAt: '2026-01-15'
				}, {
					referral: {
						id: 'ref-' + s.id,
						source: sources[i % sources.length],
						reason: reasons[i % reasons.length],
						dateReceived: '2026-01-18',
						referredBy: 'Rolling Meadows community referral'
					},
					intake: {
						id: 'int-' + s.id,
						livingArrangement: i % 2 === 0 ? 'Lives alone' : 'Lives with spouse',
						medicalHistory: 'Chronic conditions managed with PCP',
						consentOnFile: true,
						completeness: 'complete',
						intakeQuestions: {
							livesWith: i % 2 === 0 ? 'Alone' : 'Spouse',
							mealPrep: 'Prepares simple meals independently',
							transportation: 'Family assists with appointments',
							medication: 'Uses pill organizer'
						}
					},
					assessment: {
						id: 'ra-' + s.id,
						date: '2026-01-20',
						ratings: {
							falls: s.risk === 'Moderate' ? 'Medium' : s.risk,
							nutrition: 'Low',
							isolation: 'Medium',
							housing: 'Low',
							abuseRisk: 'Low'
						},
						compositeScore: 40 + i * 3,
						overallRisk: s.risk === 'Moderate' ? 'Medium' : s.risk
					},
					carePlans: i % 2 === 0 ? [{
						issue: 'Safety', goal: 'Reduce fall risk', service: 'Home visit monitoring', status: 'In Progress'
					}] : [],
					enrollments: i < 10 ? [{ serviceOrEventId: 'evt-holiday', dateEnrolled: '2026-06-10' }] : [],
					cbo: i === 1 ? { cboName: 'Northwest Community Center', status: 'Pending', date: '2026-06-01' } :
						i === 4 ? { cboName: 'Area Agency on Aging', status: 'Sent', date: '2026-05-28' } : null,
					notes: [{ date: noteDate, type: i % 2 === 0 ? 'phone call' : 'home visit', text: 'Routine follow-up completed.' }]
				});
			}, this);
		},

		_seedSpecialCases: function () {
			this._seedClientRecord({
				id: 'cli-incomplete-1',
				name: 'Robert J Smith',
				dob: '',
				phone: '(847) 555-0199',
				address: 'Unknown — police referral',
				programId: PROGRAM_ID,
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: true,
				createdAt: '2026-07-01'
			}, {
				referral: {
					id: 'ref-incomplete-1', source: 'Police', reason: 'Unsafe living conditions',
					dateReceived: '2026-07-01', referredBy: 'Rolling Meadows Police Department'
				},
				intake: { id: 'int-incomplete-1', completeness: 'incomplete', consentOnFile: false }
			});

			RM.ClientRepository.save({
				id: 'cli-flag-demo',
				name: 'Susan Taylor',
				dob: '1946-03-20',
				phone: '(847) 555-0300',
				address: '100 Main St, Rolling Meadows, IL',
				programId: 'prog-police-ss',
				caseManagerId: 'usr-cross-program-liaison',
				status: 'active',
				incompleteIntake: false
			});

			RM.ReferralRepository.save({
				id: 'ref-flag-demo', clientId: 'cli-flag-demo', source: 'Police',
				reason: 'Welfare check', dateReceived: '2026-06-15', referredBy: 'Police Social Services'
			});
		},

		_seedDuplicateCandidates: function () {
			// Pair 1 — same person entered twice (punctuation / formatting difference)
			this._seedClientRecord({
				id: 'cli-dup-oconnor-a',
				name: "Margaret O'Connor",
				dob: '1943-05-12',
				phone: '(847) 555-0401',
				address: '220 Linden Ave, Rolling Meadows, IL',
				programId: PROGRAM_ID,
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: false,
				createdAt: '2026-06-20'
			}, {
				referral: {
					id: 'ref-dup-oconnor-a', source: 'Hospital', reason: 'Falls',
					dateReceived: '2026-06-20', referredBy: 'Advocate Lutheran General Hospital'
				},
				intake: {
					id: 'int-dup-oconnor-a', livingArrangement: 'Lives alone',
					consentOnFile: true, completeness: 'complete',
					intakeQuestions: { livesWith: 'Alone', mealPrep: 'Independent', transportation: 'Family', medication: 'Self-managed' }
				},
				assessment: {
					id: 'ra-dup-oconnor-a', date: '2026-06-22',
					ratings: { falls: 'Medium', nutrition: 'Low', isolation: 'Medium', housing: 'Low', abuseRisk: 'Low' },
					compositeScore: 48, overallRisk: 'Medium'
				}
			});

			this._seedClientRecord({
				id: 'cli-dup-oconnor-b',
				name: 'Margaret OConnor',
				dob: '1943-05-12',
				phone: '(847) 555-0401',
				address: '220 Linden Avenue, Rolling Meadows, IL 60008',
				programId: PROGRAM_ID,
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: true,
				createdAt: '2026-07-18'
			}, {
				referral: {
					id: 'ref-dup-oconnor-b', source: 'Physician', reason: 'Falls',
					dateReceived: '2026-07-18', referredBy: 'Dr. Patel — Rolling Meadows Medical Group'
				},
				intake: {
					id: 'int-dup-oconnor-b', completeness: 'incomplete', consentOnFile: false
				}
			});

			// Pair 2 — nickname vs legal name, shared phone and DOB
			this._seedClientRecord({
				id: 'cli-dup-walsh-a',
				name: 'Patricia Walsh',
				dob: '1944-07-01',
				phone: '(847) 555-0402',
				address: '18 Grove St, Rolling Meadows, IL',
				programId: PROGRAM_ID,
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: false,
				createdAt: '2026-05-10'
			}, {
				referral: {
					id: 'ref-dup-walsh-a', source: 'Self', reason: 'Isolation',
					dateReceived: '2026-05-10', referredBy: 'Self-referral via senior center'
				},
				intake: {
					id: 'int-dup-walsh-a', livingArrangement: 'Lives with adult daughter',
					consentOnFile: true, completeness: 'complete',
					intakeQuestions: { livesWith: 'Daughter', mealPrep: 'Daughter prepares meals', transportation: 'Limited', medication: 'Daughter assists' }
				},
				assessment: {
					id: 'ra-dup-walsh-a', date: '2026-05-12',
					ratings: { falls: 'Low', nutrition: 'Medium', isolation: 'High', housing: 'Low', abuseRisk: 'Low' },
					compositeScore: 52, overallRisk: 'Medium'
				},
				notes: [{ date: '2026-06-01', type: 'phone call', text: 'Initial outreach — client prefers to be called Pat.' }]
			});

			this._seedClientRecord({
				id: 'cli-dup-walsh-b',
				name: 'Pat Walsh',
				dob: '1944-07-01',
				phone: '(847) 555-0402',
				address: '18 Grove Street, Rolling Meadows, IL',
				programId: PROGRAM_ID,
				caseManagerId: CM_ID,
				status: 'active',
				incompleteIntake: true,
				createdAt: '2026-07-19'
			}, {
				referral: {
					id: 'ref-dup-walsh-b', source: 'Neighbor', reason: 'Isolation',
					dateReceived: '2026-07-19', referredBy: 'Neighbor welfare concern'
				},
				intake: {
					id: 'int-dup-walsh-b', completeness: 'incomplete', consentOnFile: false
				}
			});
		},

		ROLE_OPTIONS: [
			{ userId: 'usr-case-manager', label: 'Case Manager' },
			{ userId: 'usr-supervisor', label: 'Supervisor / Dept Admin' },
			{ userId: 'usr-cross-program-liaison', label: 'Cross-Program Liaison (Police Social Services)' },
			{ userId: 'usr-auditor', label: 'Auditor (Aggregate reports only)' }
		]
	};
})();
