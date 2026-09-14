# Course requirements and dataset workflow

[Project overview](../README.md) · [Data model](data.md) · [Dataset guide](../data/course/README.md)

## Current evidence

| Requirement | Evidence or gap |
| --- | --- |
| Real problem | Geographic context and source inspection for research questions |
| React frontend | Implemented in `apps/web` |
| Node.js backend | Still pending: API and worker launch with Bun |
| Backend users collection | Implemented by `MongoUserStore` |
| Authentication and authorization | Password/email verification, OAuth, sessions and role gates are implemented |
| Related collections | Users own datasets; datasets contain ordered dataset records |
| Excel with at least 100 records and CSV export | Delivered: 120 synthetic infrastructure projects, one workbook sheet and matching UTF-8 CSV |
| Node.js filesystem read/write | Node generator/seed reads inputs and writes artifacts and verification reports |
| Mongoose models before seeds | Dataset and dataset-record models implemented; seed defines models before insertion |
| Seeds insert related data | Isolated `atlas_course_demo` seed creates a synthetic owner, dataset and 120 records |
| Optional uploads | Saved CSV/XLSX datasets, inquiry attachments and profile images are implemented |

## Delivered dataset flow

The [dataset guide](../data/course/README.md) is the source for generation, seeding, validation commands and the user flow. Users save all rows, choose **Use** to attach a CSV export, submit for AI interpretation, then review and submit the proposed research question. Interpretation receives a profile containing the first 20 rows. Saving does not start AI or create map points, and research is not run separately for every row.

The sample contains fictional infrastructure projects in real cities, explicitly marked as synthetic. It replaces the earlier proposal to seed fabricated completed research runs. The synthetic seed owner cannot log in; browser uploads belong to the signed-in user.

## Remaining acceptance and runtime work

CSV/XLSX parity and isolated persistence checks have passed. Real-browser acceptance through dataset use, interpretation and research remains pending. Research execution requires a worker and providers; paid inference and database writes need explicit authorization.

A Node-only seed does not establish a Node backend. Adapting the actual API and worker still requires compatible TypeScript loading, a Node-compatible password adapter with existing-hash verification, and updated runtime/image launch targets. No runtime migration is delivered by this dataset work.
