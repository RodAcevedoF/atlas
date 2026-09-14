import type { Dataset } from "@atlas/domain";
import { useEffect, useRef, useState } from "react";
import { useDatasetRepository } from "../dataset-provider.tsx";

export function useDatasets(onUse: (file: File) => void) {
  const repository = useDatasetRepository();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lifetime = useRef(0);

  useEffect(() => {
    return () => {
      lifetime.current += 1;
    };
  }, []);

  async function perform(operation: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await operation();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Dataset operation failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(): Promise<void> {
    setOpen(!open);
    if (open) return;
    await perform(async () => setDatasets(await repository.list()));
  }

  async function save(file: File): Promise<void> {
    await perform(async () => {
      await repository.save(file);
      setDatasets(await repository.list());
    });
  }

  async function use(dataset: Dataset): Promise<void> {
    const startedAt = lifetime.current;
    await perform(async () => {
      const file = await repository.file(dataset);
      if (startedAt !== lifetime.current) return;
      onUse(file);
      setOpen(false);
    });
  }

  async function remove(id: string): Promise<void> {
    await perform(async () => {
      await repository.delete(id);
      setDatasets((current) => current.filter((dataset) => dataset.id !== id));
    });
  }

  return { datasets, open, busy, error, toggle, save, use, remove };
}
