-- Table: public.commentLikes

-- DROP TABLE IF EXISTS public."commentLikes";

CREATE TABLE IF NOT EXISTS public."CommentLikes"
(
    "userId" text COLLATE pg_catalog."default" NOT NULL,
    "commentId" text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "CommentLikes_pkey" PRIMARY KEY ("userId", "commentId"),
    CONSTRAINT "commentLikes_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES public."Users" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT "commentLikes_commentId_fkey" FOREIGN KEY ("commentId")
        REFERENCES public."Comments" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."CommentLikes"
    OWNER to brontosaur;