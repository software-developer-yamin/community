"use client";

import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@community/ui/lib/utils";
import { X } from "lucide-react";
import type { ComponentProps, ComponentPropsWithoutRef } from "react";

function DialogRoot({
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Root>) {
  return <Dialog.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Trigger>) {
  return <Dialog.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Portal>) {
  return <Dialog.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Close>) {
  return <Dialog.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Backdrop>) {
  return (
    <Dialog.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/80 transition-opacity data-closed:opacity-0 data-open:opacity-100",
        className
      )}
      data-slot="dialog-overlay"
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Popup>) {
  return (
    <Dialog.Portal data-slot="dialog-portal">
      <DialogOverlay />
      <Dialog.Popup
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg transition-all data-closed:scale-95 data-open:scale-100 data-closed:opacity-0 data-open:opacity-100 sm:max-w-lg",
          className
        )}
        data-slot="dialog-content"
        {...props}
      >
        {children}
        <Dialog.Close className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0">
          <X />
          <span className="sr-only">Close</span>
        </Dialog.Close>
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      data-slot="dialog-header"
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      data-slot="dialog-footer"
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      className={cn("font-semibold text-lg leading-none", className)}
      data-slot="dialog-title"
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot as Dialog,
  DialogTitle,
  DialogTrigger,
};
