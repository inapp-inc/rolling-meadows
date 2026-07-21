/* global RM */
(function () {
	'use strict';

	RM.DeduplicationService = {
		check: function (partial, excludeId) {
			var matches = RM.ClientRepository.findDuplicates(partial);
			if (excludeId) {
				matches = matches.filter(function (m) { return m.client.id !== excludeId; });
			}
			return matches;
		},

		normalizePhone: function (phone) {
			return (phone || '').replace(/\D/g, '');
		}
	};
})();
