"use client";

import { Fragment } from "react";
import { Dialog, Transition, DialogPanel, TransitionChild } from "@headlessui/react";

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  message?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmModal({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" open={open} onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[black]/60 z-[999]" />
        </TransitionChild>

        <div className="fixed inset-0 z-[1000] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-md my-8 text-black dark:text-white-dark">
                <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                  <h5 className="font-bold text-lg">{title}</h5>
                  <button type="button" className="text-white-dark hover:text-dark" onClick={onClose}>
                    ✖
                  </button>
                </div>
                <div className="p-5">
                  <div className="mb-6">{message}</div>
                  <div className="flex justify-end items-center">
                    <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                      {cancelText}
                    </button>
                    <button type="button" className="btn btn-primary ltr:ml-4 rtl:mr-4" onClick={onConfirm}>
                      {confirmText}
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
