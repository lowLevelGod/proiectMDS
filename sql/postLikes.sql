-- Table: public.PostLikes

-- DROP TABLE IF EXISTS public."PostLikes";

CREATE TABLE IF NOT EXISTS public."PostLikes"
(
    "userId" text COLLATE pg_catalog."default" NOT NULL,
    "postId" text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "PostLikes_pkey" PRIMARY KEY ("userId", "postId"),
    CONSTRAINT "postLikes_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES public."Users" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT "postLikes_postId_fkey" FOREIGN KEY ("postId")
        REFERENCES public."Posts" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."PostLikes"
    OWNER to brontosaur;