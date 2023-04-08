-- Table: public.Followers

-- DROP TABLE IF EXISTS public."Followers";

CREATE TABLE IF NOT EXISTS public."Followers"
(
    follows text COLLATE pg_catalog."default" NOT NULL,
    "followedBy" text COLLATE pg_catalog."default" NOT NULL,
    accepted boolean NOT NULL DEFAULT false,
    CONSTRAINT "Followers_pkey" PRIMARY KEY (follows, "followedBy"),
    CONSTRAINT "followers_followedBy_fkey" FOREIGN KEY ("followedBy")
        REFERENCES public."Users" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT followers_follows_fkey FOREIGN KEY (follows)
        REFERENCES public."Users" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."Followers"
    OWNER to brontosaur;