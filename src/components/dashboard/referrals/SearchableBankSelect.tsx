"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ChevronDown } from "lucide-react";

interface SearchableBankSelectProps {
  banks: Array<{ code: string; name: string }>;
  value: string;
  onChange: (bankCode: string, bankName: string) => void;
  placeholder?: string;
}

export function SearchableBankSelect({
  banks,
  value,
  onChange,
  placeholder = "Search and select bank...",
}: SearchableBankSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedBank = banks.find((b) => b.code === value);

  // Filter banks based on search term
  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (bankCode: string, bankName: string) => {
    onChange(bankCode, bankName);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white flex items-center justify-between"
      >
        <span className={selectedBank ? "text-slate-900" : "text-slate-500"}>
          {selectedBank ? selectedBank.name : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setSearchTerm("");
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-80 overflow-hidden flex flex-col"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search banks..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Bank List */}
            <div className="overflow-y-auto max-h-64">
              {filteredBanks.length > 0 ? (
                <div className="p-1">
                  {filteredBanks.map((bank) => (
                    <button
                      key={bank.code}
                      type="button"
                      onClick={() => handleSelect(bank.code, bank.name)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        value === bank.code
                          ? "bg-emerald-50 text-emerald-900 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {bank.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-slate-500">
                  No banks found matching "{searchTerm}"
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}











