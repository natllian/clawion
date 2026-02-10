export const pillBaseClass =
	"inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-0.5 font-medium";

export const pillClass = `${pillBaseClass} text-[0.65rem] text-foreground`;

export const pillCompactClass = `${pillBaseClass} text-[0.6rem] text-foreground/80`;

export const pillInteractiveClass = `${pillClass} hover-bg-unified hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`;

export const pillInteractiveCompactClass = `${pillCompactClass} hover-bg-unified hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`;

export const pillMutedClass = `${pillClass} border-dashed text-muted-foreground`;
