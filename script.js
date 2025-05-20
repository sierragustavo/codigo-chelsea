document.addEventListener('DOMContentLoaded', () => {
    const invoiceForm = document.getElementById('invoiceForm');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');

    invoiceForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        // Clear previous results
        resultDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        resultDiv.innerHTML = '';
        errorDiv.innerHTML = '';

        const montoTotal = parseInt(document.getElementById('montoTotal').value);
        const cantidadFacturas = parseInt(document.getElementById('cantidadFacturas').value);
        const montoMinimo = parseInt(document.getElementById('montoMinimo').value);
        const montoMaximo = parseInt(document.getElementById('montoMaximo').value);
        const paso = 5000;

        try {
            const facturas = generarFacturas(montoTotal, cantidadFacturas, montoMinimo, montoMaximo, paso);
            displayResults(facturas);
        } catch (e) {
            displayError(e.message);
        }
    });

    function generarFacturas(monto_total, cantidad_facturas, monto_minimo, monto_maximo, paso = 5000) {
        // Validaciones
        if (monto_total % paso !== 0) {
            throw new Error("El monto total debe ser múltiplo de 5000.");
        }
        if (monto_minimo % paso !== 0 || monto_maximo % paso !== 0) {
            throw new Error("Los montos mínimo y máximo deben ser múltiplos de 5000.");
        }

        const min_total = cantidad_facturas * monto_minimo;
        const max_total = cantidad_facturas * monto_maximo;

        if (monto_total < min_total || monto_total > max_total) {
            throw new Error("No es posible generar facturas con los parámetros dados.");
        }

        const facturas = [];
        let restante = monto_total;

        for (let i = 0; i < cantidad_facturas - 1; i++) {
            let maximo_posible = Math.min(monto_maximo, restante - monto_minimo * (cantidad_facturas - i - 1));
            let minimo_posible = Math.max(monto_minimo, restante - monto_maximo * (cantidad_facturas - i - 1));

            // Ajustar a múltiplos del paso
            minimo_posible = Math.ceil(minimo_posible / paso) * paso;
            maximo_posible = Math.floor(maximo_posible / paso) * paso;

            if (minimo_posible > maximo_posible) {
                 throw new Error("Error interno: No se pudieron encontrar montos válidos para las facturas restantes.");
            }

            const opciones = [];
            for (let m = minimo_posible; m <= maximo_posible; m += paso) {
                opciones.push(m);
            }

            if (opciones.length === 0) {
                throw new Error("Error interno: No hay opciones válidas para generar una factura.");
            }

            const monto = opciones[Math.floor(Math.random() * opciones.length)];
            facturas.push(monto);
            restante -= monto;
        }

        let ultima_factura = restante;

        // Ajuste final para asegurar que la última factura cumple con los mínimos
        if (ultima_factura < monto_minimo) {
            // Find the largest invoice that can be reduced
            let foundAdjustment = false;
            for (let i = 0; i < facturas.length; i++) {
                const diffNeeded = monto_minimo - ultima_factura;
                if (facturas[i] - diffNeeded >= monto_minimo && diffNeeded % paso === 0) {
                    facturas[i] -= diffNeeded;
                    ultima_factura += diffNeeded;
                    foundAdjustment = true;
                    break;
                }
            }

            if (!foundAdjustment) {
                throw new Error("No se pudo ajustar la última factura sin violar los mínimos.");
            }
        } else if (ultima_factura > monto_maximo) {
             // If the last invoice is too high, try to increase other invoices
            let foundAdjustment = false;
            for (let i = 0; i < facturas.length; i++) {
                const diffExcess = ultima_factura - monto_maximo;
                if (facturas[i] + diffExcess <= monto_maximo && diffExcess % paso === 0) {
                    facturas[i] += diffExcess;
                    ultima_factura -= diffExcess;
                    foundAdjustment = true;
                    break;
                }
            }
            if (!foundAdjustment) {
                // If direct adjustment fails, try distributing the excess
                let distributedExcess = 0;
                for (let i = 0; i < facturas.length && distributedExcess < (ultima_factura - monto_maximo); i++) {
                    const room = monto_maximo - facturas[i];
                    const canAdd = Math.min(room, (ultima_factura - monto_maximo) - distributedExcess);
                    const actualAdd = Math.floor(canAdd / paso) * paso; // Ensure it's a multiple of paso
                    facturas[i] += actualAdd;
                    distributedExcess += actualAdd;
                }
                ultima_factura -= distributedExcess;
                if (ultima_factura > monto_maximo) {
                     throw new Error("No se pudo ajustar la última factura sin violar los máximos.");
                }
            }
        }

        if (ultima_factura % paso !== 0) {
            throw new Error("La última factura generada no es múltiplo de 5000. Error interno.");
        }


        facturas.push(ultima_factura);

        // Final check to ensure all invoices are within min/max and sum up correctly
        const finalSum = facturas.reduce((sum, current) => sum + current, 0);
        if (finalSum !== monto_total) {
            throw new Error(`Error de suma: La suma de las facturas (${finalSum}) no coincide con el monto total (${monto_total}).`);
        }
        for (const monto of facturas) {
            if (monto < monto_minimo || monto > monto_maximo) {
                throw new Error(`Error: Una factura (${monto}) está fuera del rango mínimo/máximo.`);
            }
             if (monto % paso !== 0) {
                throw new Error(`Error: Una factura (${monto}) no es múltiplo de 5000.`);
            }
        }


        return facturas;
    }

    function displayResults(facturas) {
        let html = '<h2>Facturas generadas:</h2>';
        html += '<table>';
        html += '<thead><tr><th>Factura</th><th>Monto</th></tr></thead>';
        html += '<tbody>';
        let total = 0;
        facturas.forEach((monto, index) => {
            html += `<tr><td>${index + 1}</td><td>$${monto.toLocaleString('es-AR')}</td></tr>`;
            total += monto;
        });
        html += '</tbody>';
        html += '</table>';
        html += `<p><strong>Total: $${total.toLocaleString('es-AR')}</strong></p>`;

        // Create CSV content
        let csvContent = "Factura,Monto\n";
        facturas.forEach((monto, index) => {
            csvContent += `${index + 1},${monto}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        html += `<a href="${url}" download="facturas.csv" class="download-button">Descargar CSV</a>`;

        resultDiv.innerHTML = html;
        resultDiv.style.display = 'block';
    }

    function displayError(message) {
        errorDiv.textContent = `Error: ${message}`;
        errorDiv.style.display = 'block';
    }
});