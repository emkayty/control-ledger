# External Security Benchmarks Used in the Release-Readiness Assessment

## OWASP Application Security Verification Standard

Source: https://owasp.org/www-project-application-security-verification-standard/

OWASP describes ASVS as a basis for testing web-application technical security controls and a list of requirements for secure development. The page states that it can be used as a metric or yardstick for application owners to assess the degree of trust that can be placed in a web application. The current stable version listed on the source page is ASVS 5.0.0.

## OWASP File Upload Cheat Sheet

Source: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

Relevant verification criteria from the guidance include: allow only business-critical file types; do not rely solely on user-supplied content type; generate safe filenames; enforce file size limits; restrict upload capability to authorised users; store files separately from the application host when possible; and address the risks of public file retrieval. The guidance also identifies content validation, malware scanning or sandboxing where available, file-signature validation, and request limits as defence-in-depth measures that were not all within the current implementation scope.
