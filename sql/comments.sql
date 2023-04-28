-- Table: public.Comments

-- DROP TABLE IF EXISTS public."Comments";

CREATE TABLE IF NOT EXISTS public."Comments"
(
    id text COLLATE pg_catalog."default" NOT NULL,
    "createdAt" date NOT NULL,
    "userId" text COLLATE pg_catalog."default" NOT NULL,
    "postId" text COLLATE pg_catalog."default" NOT NULL,
    content text COLLATE pg_catalog."default" NOT NULL,
    "parentId" text COLLATE pg_catalog."default",
    CONSTRAINT "Comments_pkey" PRIMARY KEY (id),
    CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId")
        REFERENCES public."Comments" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
        NOT VALID,
    CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId")
        REFERENCES public."Posts" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES public."Users" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."Comments"
    OWNER to brontosaur;