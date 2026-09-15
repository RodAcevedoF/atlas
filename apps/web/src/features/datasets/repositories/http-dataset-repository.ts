import { fetchBlob, fetchJson, fetchNoContent } from "@/shared/http.ts";
import type { Dataset, DatasetSheetPreview } from "@atlas/domain";
import type { DatasetRepository } from "./dataset-repository.ts";

export class HttpDatasetRepository implements DatasetRepository {
  list(): Promise<Dataset[]> {
    return fetchJson<Dataset[]>("/api/datasets");
  }

  preview(file: File): Promise<DatasetSheetPreview[]> {
    return fetchJson<DatasetSheetPreview[]>("/api/datasets/preview", uploadOptions(file));
  }

  save(file: File, worksheet?: string): Promise<Dataset[]> {
    return fetchJson<Dataset[]>("/api/datasets", uploadOptions(file, worksheet));
  }

  async file(dataset: Dataset): Promise<File> {
    const blob = await fetchBlob(`/api/datasets/${encodeURIComponent(dataset.id)}/csv`);
    if (!blob) throw new Error("Dataset file is unavailable");
    return new File([blob], `${dataset.name.replace(/\.(xlsx|csv)$/i, "")}.csv`, {
      type: "text/csv",
    });
  }

  delete(id: string): Promise<void> {
    return fetchNoContent(`/api/datasets/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}

function uploadOptions(file: File, worksheet?: string): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": file.name.toLowerCase().endsWith(".csv")
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Atlas-Filename": encodeURIComponent(file.name),
      ...(worksheet === undefined ? {} : { "X-Atlas-Worksheet": encodeURIComponent(worksheet) }),
    },
    body: file,
  };
}
