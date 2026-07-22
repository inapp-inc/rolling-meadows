/* global RM */
(function () {
	'use strict';

	var base = RM.BaseRepository.createBase('referral');

	RM.ReferralRepository = Object.assign({}, base, {
		findByClientId: function (clientId) {
			return this.findAll().filter(function (r) { return r.clientId === clientId; });
		}
	});
})();
