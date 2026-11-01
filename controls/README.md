# Controls

Pinned catalog: `NIST_SP-800-53_rev5_catalog.json`, NIST SP 800-53 Rev 5, Release 5.2.0, last modified 2026-10-22, from usnistgov/oscal-content commit `5006f18c8047643eaa70e35dd0d20a58bcc41856`. Notes in this directory derive from that file. A note is proposed by anyone or by the remediate-finding procedure, reviewed by security as CODEOWNER, and merged. When NIST revises the catalog, a diff against this pinned file shows which notes to revisit.

`npm run control -- ac-3` prints one control's statement and parameters from the pinned file. The procedure uses that when a finding names a control with no note yet. It does not read the catalog file into the chat.
