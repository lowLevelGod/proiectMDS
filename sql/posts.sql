-- Table: public.Posts

-- DROP TABLE IF EXISTS public."Posts";

CREATE TABLE IF NOT EXISTS public."Posts"
(
    id text COLLATE pg_catalog."default" NOT NULL,
    "createdAt" date NOT NULL,
    "userId" text COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    "picturesURLs" text[] COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "Posts_pkey" PRIMARY KEY (id),
    CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES public."Users" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."Posts"
    OWNER to brontosaur;

COMMENT ON CONSTRAINT "posts_userId_fkey" ON public."Posts"
    IS 'One post has one user';