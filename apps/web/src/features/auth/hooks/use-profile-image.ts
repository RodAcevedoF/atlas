import { useEffect, useState } from "react";
import type { ProfileRepository } from "../repositories/profile-repository.ts";
import { getProfileImage } from "../use-cases/profile-image.ts";

export function useProfileImage(repository: ProfileRepository, revision: string | null) {
  const [image, setImage] = useState<{ revision: string; url: string } | null>(null);

  useEffect(() => {
    if (!revision) return;
    const imageRevision = revision;
    const controller = new AbortController();
    let objectUrl: string | null = null;

    async function loadImage() {
      try {
        const blob = await getProfileImage(repository, controller.signal);
        if (controller.signal.aborted || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setImage({ revision: imageRevision, url: objectUrl });
      } catch (caught) {
        if (controller.signal.aborted) return;
        console.error("Failed to load profile image", caught);
      }
    }

    void loadImage();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [repository, revision]);

  return image?.revision === revision ? image.url : null;
}
